/**
 * Beat / onset analysis of a music track, so motion can snap to the music.
 *
 * Pipeline (all at the 22050 Hz analysis rate): STFT → log-compressed spectral
 * flux in three bands → onset envelope → tempo by autocorrelation with a
 * log-Gaussian prior → beats by dynamic programming (Ellis 2007) → each beat
 * and onset refined to the true attack with a time-domain band-energy rise
 * (the STFT window only says "an onset is within this frame") → bar phase by
 * a kick/snare bar template plus the harmonic change at each candidate's bar
 * lines.
 */
import { spawn } from "node:child_process";

export type Band = "low" | "mid" | "high";

export interface Onset {
  /** Seconds. */
  t: number;
  /** 0..1, relative to the track's strongest onset. */
  strength: number;
  band: Band;
}

export interface BeatAnalysis {
  sampleRate: number;
  /** Seconds. */
  duration: number;
  /** Rounded to 0.01. */
  bpm: number;
  beatsPerBar: number;
  /** Seconds, ascending, every beat of the track (tempo-tracked). */
  beats: number[];
  /** Seconds, the bar starts: a subset of beats. */
  downbeats: number[];
  /** Percussive hits, ascending t. */
  onsets: Onset[];
  /** RMS per hop (hop in seconds), 0..1, for drawing a waveform chart. */
  envelope: { hop: number; values: number[] };
}

export interface AnalyzeOptions {
  /** Force the tempo; phase is still tracked. */
  bpm?: number;
  beatsPerBar?: number;
  minBpm?: number;
  maxBpm?: number;
  /** A track time that is a downbeat; forces the bar phase. */
  firstDownbeat?: number;
}

const RATE = 22050;
const N = 1024;
const HOP = 256;
const BINS = N / 2 + 1;
const BIN_HZ = RATE / N;
const BAND_EDGES: Record<Band, [number, number]> = {
  low: [1, Math.ceil(150 / BIN_HZ)],
  mid: [Math.ceil(150 / BIN_HZ), Math.ceil(2000 / BIN_HZ)],
  high: [Math.ceil(2000 / BIN_HZ), BINS],
};
const BANDS: Band[] = ["low", "mid", "high"];
/**
 * Flux counts only energy above the band's recent maximum, so a tremolo, a
 * beating sub or a sidechain pump recovering its level is not an onset. The
 * hold is shorter where hits repeat faster (16th hats at 180 bpm are 83 ms apart).
 */
const HOLD_FRAMES: Record<Band, number> = { low: 8, mid: 3, high: 2 };
/**
 * How much a band's flux is scaled down at frames where the band is quiet
 * (exponent on level / loud level). The log rise is relative, so in the low
 * band, six bins of sustained tones, a bin recovering from a near-cancellation
 * (a kick's sub tail beating against a bass note) would score like a hit; a
 * hit has to be loud as well. Hats are meant to be quiet, so the high band's
 * 420 noise-like bins are not scaled.
 */
const LEVEL_POWER: Record<Band, number> = { low: 1, mid: 0.5, high: 0 };
/**
 * Attacks are timed in the time domain on three disjoint bands above the sub
 * (a kick's attack is its sweep start, click and drive harmonics; the sub
 * arrives 50–80 ms later). Each band's relative energy rise is summed with
 * weights by the onset's flux band, so a band that cannot see the event (a
 * riser masking the click above 2 kHz, a pad swelling below 500 Hz)
 * contributes nothing instead of misleading.
 */
type AttackBand = "lowmid" | "transient" | "high";
const ATTACK_BANDS: AttackBand[] = ["lowmid", "transient", "high"];
const ATTACK_BAND_HZ: Record<AttackBand, [number, number]> = { lowmid: [150, 500], transient: [500, 2000], high: [2000, Infinity] };
const ATTACK_WEIGHTS: Record<Band, Record<AttackBand, number>> = {
  low: { lowmid: 1, transient: 1, high: 0.5 },
  mid: { lowmid: 1, transient: 1, high: 0.5 },
  high: { lowmid: 0.25, transient: 0.5, high: 1 },
};
/** Energy is summed over this many blocks (5.8 ms), a period of the lowest timing band, so sustained tones read as a steady floor. */
const SMOOTH_BLOCKS = 4;
/**
 * Search window around the flux peak, seconds before and after. A kick's low
 * flux peaks 35–50 ms after the attack (the sub builds as the sweep descends);
 * an impulse's flux peaks up to half a window before it.
 */
const ATTACK_WINDOW: Record<Band, [number, number]> = { low: [0.07, 0.045], mid: [0.035, 0.045], high: [0.025, 0.03] };
/** Time-domain energy block for the fine onset stage. */
const BLOCK = 32;
/** Log compression of STFT magnitudes normalised so a full-scale sine is 1. */
const COMPRESS = 100;
const TIGHTNESS = 100;

export function analyzePcm(samples: Float32Array, sampleRate: number, opts: AnalyzeOptions = {}): BeatAnalysis {
  const beatsPerBar = opts.beatsPerBar ?? 4;
  const minBpm = opts.minBpm ?? 70;
  const maxBpm = opts.maxBpm ?? 180;
  const x = normalise(resample(samples, sampleRate, RATE));
  const duration = samples.length / sampleRate;

  const mags = stft(x);
  const flux = bandFlux(mags);
  const onsets = pickOnsets(flux, attackEnergy(x));

  const envelopeValues = rmsEnvelope(x, HOP);
  const empty: BeatAnalysis = {
    sampleRate,
    duration,
    bpm: opts.bpm ?? 0,
    beatsPerBar,
    beats: [],
    downbeats: [],
    onsets,
    envelope: { hop: HOP / RATE, values: envelopeValues },
  };
  if (onsets.length === 0) return empty;

  const onsetEnv = onsetEnvelope(flux);
  const period = opts.bpm ? (60 / opts.bpm) * (RATE / HOP) : estimatePeriod(onsetEnv, minBpm, maxBpm);
  if (!period) return empty;
  const beatFrames = trackBeats(onsetEnv, period);
  const beats = refineBeats(beatFrames, onsetEnv, onsets);
  if (beats.length === 0) return empty;

  const bpm = Math.round(tempoOf(beats, period) * 100) / 100;
  const phase = opts.firstDownbeat === undefined ? barPhase(beats, onsets, mags, beatsPerBar, period) : forcedPhase(beats, opts.firstDownbeat, beatsPerBar);
  const downbeats = beats.filter((_, i) => i % beatsPerBar === phase);
  return { ...empty, bpm, beats, downbeats };
}

export async function decodeAudio(file: string, sampleRate = RATE): Promise<Float32Array> {
  const bin = process.env.HYPERFRAMES_FFMPEG_PATH || "ffmpeg";
  const args = ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sampleRate), "-f", "f32le", "-"];
  const pcm = await new Promise<Buffer>((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let stderr = "";
    p.stdout.on("data", (d: Buffer) => chunks.push(d));
    p.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg failed decoding ${file}: ${stderr.trim()}`))));
  });
  const bytes = pcm.length - (pcm.length % 4);
  const out = new Float32Array(bytes / 4);
  new Uint8Array(out.buffer).set(pcm.subarray(0, bytes));
  return out;
}

export async function analyzeFile(file: string, opts: AnalyzeOptions = {}): Promise<BeatAnalysis> {
  return analyzePcm(await decodeAudio(file, RATE), RATE, opts);
}

// ---------------------------------------------------------------- signal

function normalise(x: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  if (peak === 0 || peak === 1) return x;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] / peak;
  return out;
}

/** Windowed-sinc resampling (Blackman, 24 taps each side) from a table of 512 sub-sample phases. */
function resample(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x;
  const ratio = from / to;
  const cutoff = Math.min(1, 1 / ratio);
  const half = 24;
  const taps = 2 * half;
  const phases = 512;
  const kernel = new Float64Array(phases * taps);
  for (let p = 0; p < phases; p++) {
    const frac = p / phases;
    for (let j = 0; j < taps; j++) {
      const u = j - half + 1 - frac;
      const v = u / half;
      const w = 0.42 + 0.5 * Math.cos(Math.PI * v) + 0.08 * Math.cos(2 * Math.PI * v);
      const s = u === 0 ? 1 : Math.sin(Math.PI * cutoff * u) / (Math.PI * cutoff * u);
      kernel[p * taps + j] = s * w * cutoff;
    }
  }
  const n = Math.floor(x.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const centre = i * ratio;
    const base = Math.floor(centre);
    const p = Math.round((centre - base) * phases) % phases;
    const row = p * taps;
    let acc = 0;
    for (let j = 0; j < taps; j++) {
      const k = base - half + 1 + j;
      if (k >= 0 && k < x.length) acc += x[k] * kernel[row + j];
    }
    out[i] = acc;
  }
  return out;
}

function rmsEnvelope(x: Float32Array, hop: number): number[] {
  const n = Math.ceil(x.length / hop);
  const values = new Array<number>(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    let acc = 0;
    const end = Math.min(x.length, (i + 1) * hop);
    for (let j = i * hop; j < end; j++) acc += x[j] * x[j];
    values[i] = Math.sqrt(acc / hop);
    peak = Math.max(peak, values[i]);
  }
  return peak ? values.map((v) => v / peak) : values;
}

// ---------------------------------------------------------------- STFT

interface Stft {
  frames: number;
  /** frames × BINS magnitudes, scaled so a full-scale sine peaks near 1. */
  mags: Float32Array;
}

const HANN = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
const REV = (() => {
  const bits = Math.log2(N);
  const rev = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  return rev;
})();
const COS = Float64Array.from({ length: N / 2 }, (_, i) => Math.cos((2 * Math.PI * i) / N));
const SIN = Float64Array.from({ length: N / 2 }, (_, i) => -Math.sin((2 * Math.PI * i) / N));

/** In-place radix-2 FFT of length N. */
function fft(re: Float64Array, im: Float64Array) {
  for (let i = 0; i < N; i++) {
    const j = REV[i];
    if (j > i) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1;
    const step = N / size;
    for (let start = 0; start < N; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = COS[k * step];
        const wi = SIN[k * step];
        const a = start + k;
        const b = a + half;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

/** Frames centred at i·HOP (zero padded), Hann window. */
function stft(x: Float32Array): Stft {
  const frames = Math.floor(x.length / HOP) + 1;
  const mags = new Float32Array(frames * BINS);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const scale = 4 / N;
  for (let f = 0; f < frames; f++) {
    const start = f * HOP - N / 2;
    for (let i = 0; i < N; i++) {
      const j = start + i;
      re[i] = j >= 0 && j < x.length ? x[j] * HANN[i] : 0;
      im[i] = 0;
    }
    fft(re, im);
    const row = f * BINS;
    for (let k = 0; k < BINS; k++) mags[row + k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]) * scale;
  }
  return { frames, mags };
}

// ---------------------------------------------------------------- onsets

type BandSeries = Record<Band, Float64Array>;
type AttackSeries = Record<AttackBand, Float64Array>;

/** Per-band mean (over bins) of the log-magnitude rise above the band's recent maximum, scaled by the band's level (LEVEL_POWER). */
function bandFlux(s: Stft): BandSeries {
  const out = { low: new Float64Array(s.frames), mid: new Float64Array(s.frames), high: new Float64Array(s.frames) };
  const logMags = new Float64Array(s.frames * BINS);
  for (let i = 0; i < logMags.length; i++) logMags[i] = Math.log1p(COMPRESS * s.mags[i]);
  for (const band of BANDS) {
    const [k0, k1] = BAND_EDGES[band];
    const hold = HOLD_FRAMES[band];
    const level = new Float64Array(s.frames);
    for (let f = 0; f < s.frames; f++) {
      let acc = 0;
      for (let k = k0; k < k1; k++) acc += s.mags[f * BINS + k];
      level[f] = acc / (k1 - k0);
    }
    const loud = percentile(level, 0.9) || 1;
    for (let f = 1; f < s.frames; f++) {
      let acc = 0;
      for (let k = k0; k < k1; k++) {
        let recent = -Infinity;
        for (let m = Math.max(0, f - hold); m < f; m++) recent = Math.max(recent, logMags[m * BINS + k]);
        const d = logMags[f * BINS + k] - recent;
        if (d > 0) acc += d;
      }
      out[band][f] = (acc / (k1 - k0)) * Math.pow(Math.min(1, level[f] / loud), LEVEL_POWER[band]);
    }
  }
  return out;
}

function onsetEnvelope(flux: BandSeries): Float64Array {
  const n = flux.low.length;
  const out = new Float64Array(n);
  for (const band of BANDS) {
    const scale = percentile(flux[band], 0.98) || 1;
    for (let i = 0; i < n; i++) out[i] += flux[band][i] / scale;
  }
  return out;
}

/** Band-passed energy per BLOCK, summed over the SMOOTH_BLOCKS ending at each block, for each attack band. */
function attackEnergy(x: Float32Array): AttackSeries {
  const blocks = Math.ceil(x.length / BLOCK);
  const out = { lowmid: new Float64Array(blocks), transient: new Float64Array(blocks), high: new Float64Array(blocks) };
  for (const band of ATTACK_BANDS) {
    const [lo, hi] = ATTACK_BAND_HZ[band];
    const hp = new Svf(RATE, lo);
    const lp = Number.isFinite(hi) ? new Svf(RATE, hi) : undefined;
    const raw = new Float64Array(blocks);
    for (let i = 0; i < x.length; i++) {
      hp.tick(x[i]);
      let v = hp.high;
      if (lp) {
        lp.tick(v);
        v = lp.low;
      }
      raw[(i / BLOCK) | 0] += v * v;
    }
    const series = out[band];
    let acc = 0;
    for (let j = 0; j < blocks; j++) {
      acc += raw[j] - (j >= SMOOTH_BLOCKS ? raw[j - SMOOTH_BLOCKS] : 0);
      series[j] = acc;
    }
  }
  return out;
}

/** Simper's trapezoidal state-variable filter at Butterworth Q. */
class Svf {
  private ic1 = 0;
  private ic2 = 0;
  private readonly k = Math.SQRT2;
  private readonly a1: number;
  private readonly a2: number;
  private readonly a3: number;
  low = 0;
  high = 0;
  constructor(sr: number, fc: number) {
    const g = Math.tan((Math.PI * fc) / sr);
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  tick(x: number) {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.high = x - this.k * v1 - v2;
  }
}

const PRE_MAX = 2;
const POST_MAX = 2;
const PRE_AVG = 9;
const POST_AVG = 5;
const MIN_GAP = 3;

function pickOnsets(flux: BandSeries, energy: AttackSeries): Onset[] {
  const found: Onset[] = [];
  for (const band of BANDS) {
    const f = flux[band];
    const delta = 0.1 * percentile(f, 0.99);
    if (delta <= 0) continue;
    let last = -Infinity;
    for (let i = 1; i < f.length - 1; i++) {
      if (f[i] < delta) continue;
      let isMax = true;
      for (let j = Math.max(0, i - PRE_MAX); j <= Math.min(f.length - 1, i + POST_MAX) && isMax; j++) if (j !== i && f[j] > f[i]) isMax = false;
      if (!isMax) continue;
      let acc = 0;
      let count = 0;
      for (let j = Math.max(0, i - PRE_AVG); j <= Math.min(f.length - 1, i + POST_AVG); j++) {
        acc += f[j];
        count++;
      }
      if (f[i] < acc / count + delta) continue;
      if (i - last < MIN_GAP) continue;
      last = i;
      const peak = parabolic(f, i);
      const t = attackTime(energy, ATTACK_WEIGHTS[band], (peak.pos * HOP) / RATE, ATTACK_WINDOW[band]);
      const prev = found[found.length - 1];
      if (prev && prev.band === band && t - prev.t < 0.01) prev.strength = Math.max(prev.strength, peak.value);
      else found.push({ t, strength: peak.value, band });
    }
  }
  const max = found.reduce((m, o) => Math.max(m, o.strength), 0) || 1;
  for (const o of found) o.strength = o.strength / max;
  return found.sort((a, b) => a.t - b.t || BANDS.indexOf(a.band) - BANDS.indexOf(b.band));
}

/** Peak position and height refined by a parabola through the three samples around i. */
function parabolic(f: ArrayLike<number>, i: number): { pos: number; value: number } {
  if (i <= 0 || i >= f.length - 1) return { pos: i, value: f[i] };
  const a = f[i - 1];
  const b = f[i];
  const c = f[i + 1];
  const denom = a - 2 * b + c;
  if (denom >= 0) return { pos: i, value: b };
  const offset = Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom));
  return { pos: i + offset, value: b - 0.25 * (a - c) * offset };
}

/**
 * The attack is the steepest relative (log) energy rise in the search window
 * around the flux peak, summed over the timing bands; a band counts only
 * where the rise reaches a quarter of that band's loudest energy in the
 * window. From there, on the band that contributed most, climb to the local
 * peak and walk back to where the rise crossed 20% of the way up from the
 * floor before it. The relative rise, not the biggest peak, so a clap's later
 * bursts and an earlier hit decaying through the window cannot win.
 */
function attackTime(energy: AttackSeries, weights: Record<AttackBand, number>, coarse: number, [before, after]: [number, number]): number {
  const blockSec = BLOCK / RATE;
  const blocks = energy.high.length;
  const j0 = Math.max(1, Math.floor((coarse - before) / blockSec));
  const j1 = Math.min(blocks - 3, Math.ceil((coarse + after) / blockSec));
  if (j1 <= j0) return coarse;
  const loudest = { lowmid: 0, transient: 0, high: 0 };
  for (const band of ATTACK_BANDS) for (let j = j0; j <= j1; j++) loudest[band] = Math.max(loudest[band], energy[band][j]);
  let rise = -1;
  let riseScore = 0;
  let riseBand: AttackBand = "transient";
  for (let j = j0; j <= j1; j++) {
    let score = 0;
    let best = 0;
    let bestBand: AttackBand = "transient";
    for (const band of ATTACK_BANDS) {
      const e = energy[band];
      if (loudest[band] <= 0 || Math.max(e[j + 1], e[j + 2]) < 0.25 * loudest[band]) continue;
      const eps = 1e-6 * loudest[band];
      const part = weights[band] * Math.max(0, Math.log(e[j + 1] + eps) - Math.log(e[j - 1] + eps));
      score += part;
      if (part > best) {
        best = part;
        bestBand = band;
      }
    }
    if (score > riseScore) {
      riseScore = score;
      rise = j;
      riseBand = bestBand;
    }
  }
  if (rise < 0) return coarse;
  const e = energy[riseBand];
  let peak = rise;
  while (peak < j1 + 1 && e[peak + 1] > e[peak]) peak++;
  let floor = e[rise];
  for (let j = j0 - 1; j <= rise; j++) floor = Math.min(floor, e[j]);
  if (e[peak] <= floor * 1.5) return coarse;
  const threshold = floor + 0.2 * (e[peak] - floor);
  let j = peak;
  while (j > j0 - 1 && e[j - 1] >= threshold) j--;
  const frac = j === j0 - 1 ? 0 : (threshold - e[j - 1]) / (e[j] - e[j - 1]);
  // For a step anywhere in a block, the interpolated 20% crossing of the
  // SMOOTH_BLOCKS sum lands 0.75 blocks after the step.
  return (j + frac - 0.75) * blockSec;
}

// ---------------------------------------------------------------- tempo

/** Beat period in frames: autocorrelation of the onset envelope × a log-Gaussian prior around 120 bpm. */
function estimatePeriod(onsetEnv: Float64Array, minBpm: number, maxBpm: number): number | undefined {
  const n = onsetEnv.length;
  const lagMin = Math.max(1, Math.floor((60 / maxBpm) * (RATE / HOP)));
  const lagMax = Math.min(n - 2, Math.ceil((60 / minBpm) * (RATE / HOP)));
  if (lagMax <= lagMin) return undefined;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += onsetEnv[i];
  mean /= n;
  const score = new Float64Array(lagMax + 2);
  for (let lag = lagMin - 1; lag <= lagMax + 1; lag++) {
    if (lag < 1 || lag >= n) continue;
    let acc = 0;
    for (let i = 0; i + lag < n; i++) acc += (onsetEnv[i] - mean) * (onsetEnv[i + lag] - mean);
    const bpm = (60 * RATE) / (lag * HOP);
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.6, 2));
    score[lag] = (acc / (n - lag)) * prior;
  }
  let best = lagMin;
  for (let lag = lagMin; lag <= lagMax; lag++) if (score[lag] > score[best]) best = lag;
  if (score[best] <= 0) return undefined;
  return parabolic(score, best).pos;
}

/** Mean tempo over the tracked beats: least-squares slope of time against index. */
function tempoOf(beats: number[], periodFrames: number): number {
  if (beats.length < 2) return (60 * RATE) / (periodFrames * HOP);
  const n = beats.length;
  const mi = (n - 1) / 2;
  let mt = 0;
  for (const t of beats) mt += t;
  mt /= n;
  let num = 0;
  let den = 0;
  beats.forEach((t, i) => {
    num += (i - mi) * (t - mt);
    den += (i - mi) * (i - mi);
  });
  return 60 / (num / den);
}

// ---------------------------------------------------------------- beats

/** Dynamic-programming beat tracker (Ellis 2007). Returns frame indices. */
function trackBeats(onsetEnv: Float64Array, period: number): number[] {
  const n = onsetEnv.length;
  const local = localScore(onsetEnv, period);
  let maxLocal = 0;
  for (let i = 0; i < n; i++) maxLocal = Math.max(maxLocal, local[i]);
  const wMin = -Math.round(2 * period);
  const wMax = -Math.round(period / 2);
  const txwt = new Float64Array(wMax - wMin + 1);
  for (let w = wMin; w <= wMax; w++) txwt[w - wMin] = -TIGHTNESS * Math.pow(Math.log(-w / period), 2);

  const cumscore = new Float64Array(n);
  const backlink = new Int32Array(n).fill(-1);
  let firstBeat = true;
  for (let i = 0; i < n; i++) {
    let best = -Infinity;
    let bestJ = -1;
    for (let w = wMin; w <= wMax; w++) {
      const j = i + w;
      const candidate = txwt[w - wMin] + (j >= 0 ? cumscore[j] : 0);
      if (candidate > best) {
        best = candidate;
        bestJ = j;
      }
    }
    cumscore[i] = local[i] + best;
    if (firstBeat && local[i] < 0.01 * maxLocal) backlink[i] = -1;
    else {
      backlink[i] = bestJ;
      firstBeat = false;
    }
  }

  // The best chain ends where the cumulative score peaks: a late spurious beat
  // costs more in transition than it adds, and silence after the last beat ties.
  let tail = 0;
  for (let i = 1; i < n; i++) if (cumscore[i] > cumscore[tail]) tail = i;
  if (cumscore[tail] <= 0) return [];
  const beats: number[] = [];
  for (let b = tail; b >= 0; b = backlink[b]) beats.push(b);
  beats.reverse();

  // Drop leading/trailing beats with no onset support (the chain starts in silence).
  const support = beats.map((b) => local[b]);
  const floor = 0.1 * percentile(Float64Array.from(support), 0.5);
  let first = 0;
  let last = beats.length - 1;
  while (first < last && support[first] < floor) first++;
  while (last > first && support[last] < floor) last--;
  return beats.slice(first, last + 1);
}

/** Onset envelope normalised by its std and smoothed with a Gaussian of σ = period/32. */
function localScore(onsetEnv: Float64Array, period: number): Float64Array {
  const n = onsetEnv.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += onsetEnv[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (onsetEnv[i] - mean) ** 2;
  const std = Math.sqrt(variance / n) || 1;
  const sigma = period / 32;
  const half = Math.round(period);
  const kernel = Float64Array.from({ length: 2 * half + 1 }, (_, i) => Math.exp(-0.5 * ((i - half) / sigma) ** 2));
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = -half; k <= half; k++) {
      const j = i + k;
      if (j >= 0 && j < n) acc += (onsetEnv[j] / std) * kernel[k + half];
    }
    out[i] = acc;
  }
  return out;
}

/** Snap each beat to the strongest onset near it (±60 ms, weighted by closeness), else keep the interpolated frame time. */
function refineBeats(frames: number[], onsetEnv: Float64Array, onsets: Onset[]): number[] {
  const out: number[] = [];
  for (const f of frames) {
    const coarse = (parabolic(onsetEnv, f).pos * HOP) / RATE;
    let best: Onset | undefined;
    let bestScore = 0;
    for (const o of onsets) {
      const d = o.t - coarse;
      if (d < -0.06) continue;
      if (d > 0.06) break;
      const score = o.strength * Math.exp(-0.5 * (d / 0.03) ** 2);
      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    }
    out.push(best ? best.t : coarse);
  }
  return out;
}

// ---------------------------------------------------------------- bars

/** Harmony is read as chroma (pitch classes) in the pad register: below 250 Hz the kick tail and bass dominate, and they are rhythm, not harmony. */
const CHROMA_LOW_HZ = 250;
const CHROMA_HIGH_HZ = 3000;
const BIN_PITCH_CLASS = Int8Array.from({ length: BINS }, (_, k) => {
  const hz = k * BIN_HZ;
  if (hz < CHROMA_LOW_HZ || hz > CHROMA_HIGH_HZ) return -1;
  return ((Math.round(69 + 12 * Math.log2(hz / 440)) % 12) + 12) % 12;
});

/**
 * Which beat phase starts the bar. Each candidate phase is scored by how well
 * the beats fit a bar template (kick on 1, half as much on 3; snare on the even
 * beats) plus the harmonic change at its downbeats, which separates 1 from 3.
 * Ties go to the earliest phase.
 */
function barPhase(beats: number[], onsets: Onset[], s: Stft, beatsPerBar: number, period: number): number {
  const novelty = harmonicNovelty(beats, s, beatsPerBar, (period * HOP) / RATE);
  const kickAt = beats.map((t) => strengthNear(onsets, t, (o) => o.band === "low"));
  const snareAt = beats.map((t) => strengthNear(onsets, t, (o) => o.band !== "low"));
  const kickWeight = (k: number) => (k === 0 ? 1 : beatsPerBar % 2 === 0 && k === beatsPerBar / 2 ? 0.5 : 0);
  const snareWeight = (k: number) => (k % 2 === 1 ? 1 : 0);
  const scores = Array.from({ length: beatsPerBar }, (_, p) => {
    let score = 0;
    let bars = 0;
    for (let i = p; i < beats.length; i += beatsPerBar) {
      for (let k = 0; k < beatsPerBar && i + k < beats.length; k++) score += kickWeight(k) * kickAt[i + k] + snareWeight(k) * snareAt[i + k];
      score += novelty[i];
      bars++;
    }
    return bars ? score / bars : 0;
  });
  let best = 0;
  for (let p = 1; p < beatsPerBar; p++) if (scores[p] > scores[best] + 1e-9) best = p;
  // Four-on-the-floor with a backbeat scores phases 0 and 2 alike; then the bar starts where the
  // music does — a produced bed opens on a downbeat (a pickup is the exception; `firstDownbeat` says so).
  const first = 0;
  return scores[first] >= scores[best] * (1 - OPENING_TIE) ? first : best;
}

/** Phase scores within this share of the best count as a tie, which the opening downbeat breaks. */
const OPENING_TIE = 0.15;

function strengthNear(onsets: Onset[], t: number, accept: (o: Onset) => boolean): number {
  let best = 0;
  for (const o of onsets) if (Math.abs(o.t - t) <= 0.04 && accept(o)) best = Math.max(best, o.strength);
  return best;
}

/**
 * Per beat, how much the harmony changes there: the cosine distance between
 * the sustained chroma of the bar before the beat and of the bar after it,
 * scaled to 0..1 and squared. Bar-long windows cancel everything that repeats
 * each bar (the bass riff, the drums, a melodic figure) at every candidate
 * phase; "sustained" is the per-class median over the window, which drops
 * plucks and hits; and chroma is built from spectral peaks, which a riser's
 * noise does not have. What survives is the chord change, on the bar line.
 */
function harmonicNovelty(beats: number[], s: Stft, beatsPerBar: number, period: number): number[] {
  const chroma = new Float64Array(s.frames * 12);
  for (let f = 0; f < s.frames; f++) {
    const row = f * BINS;
    for (let k = 1; k < BINS - 1; k++) {
      const pc = BIN_PITCH_CLASS[k];
      const m = s.mags[row + k];
      if (pc >= 0 && m > s.mags[row + k - 1] && m >= s.mags[row + k + 1]) chroma[f * 12 + pc] += m * m;
    }
  }
  const column = new Float64Array(s.frames);
  const vectorOver = (t0: number, t1: number) => {
    const f0 = Math.max(0, Math.round((t0 * RATE) / HOP));
    const f1 = Math.min(s.frames, Math.round((t1 * RATE) / HOP));
    const v = new Float64Array(12);
    if (f1 <= f0) return v;
    let mean = 0;
    for (let pc = 0; pc < 12; pc++) {
      for (let f = f0; f < f1; f++) column[f - f0] = chroma[f * 12 + pc];
      v[pc] = Math.log1p(COMPRESS * percentile(column.subarray(0, f1 - f0), 0.5));
      mean += v[pc] / 12;
    }
    for (let pc = 0; pc < 12; pc++) v[pc] -= mean;
    return v;
  };
  const cosineDistance = (a: Float64Array, b: Float64Array) => {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return na && nb ? 1 - dot / Math.sqrt(na * nb) : 0;
  };
  const bar = beatsPerBar * period;
  const duration = (s.frames * HOP) / RATE;
  const out = beats.map((t, i) => {
    if (t - bar < 0 || t + bar > duration) return 0;
    const before = vectorOver(i >= beatsPerBar ? beats[i - beatsPerBar] : t - bar, t);
    const after = vectorOver(t, i + beatsPerBar < beats.length ? beats[i + beatsPerBar] : t + bar);
    return cosineDistance(before, after);
  });
  const scale = percentile(Float64Array.from(out), 0.95) || 1;
  return out.map((v) => Math.min(1, v / scale) ** 2);
}

function forcedPhase(beats: number[], firstDownbeat: number, beatsPerBar: number): number {
  let nearest = 0;
  beats.forEach((t, i) => {
    if (Math.abs(t - firstDownbeat) < Math.abs(beats[nearest] - firstDownbeat)) nearest = i;
  });
  return nearest % beatsPerBar;
}

// ---------------------------------------------------------------- util

function percentile(values: Float64Array, p: number): number {
  if (values.length === 0) return 0;
  const sorted = Float64Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
}
