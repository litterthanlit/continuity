/**
 * Deterministic synthesis of a short electronic bed (the demo track and the
 * analysis test fixtures). A pure function of the Song: no clocks, no
 * Math.random — every noise burst draws from a PRNG seeded by (song seed,
 * voice, sample position), so one voice's noise never depends on another's.
 */

export interface Song {
  bpm: number;
  beatsPerBar?: number;
  sampleRate?: number;
  seed?: number;
  /** Silence before the first downbeat, seconds. */
  leadIn?: number;
  sections: Section[];
}

/**
 * A section is `bars` bars of patterns. Step strings have 4 × beatsPerBar
 * steps (16ths) per bar and tile across the section: "x" hit, "o" ghost (soft)
 * hit, "O" open hat (hat only; a full hit elsewhere), "." rest. Chords are one
 * per bar ("Am7", "Fmaj7", "C", "Dsus2", or a note list "A3 C4 E4"; "." or "-"
 * for none) and tile too.
 */
export interface Section {
  bars: number;
  kick?: string;
  snare?: string;
  hat?: string;
  clap?: string;
  bass?: Note[];
  chords?: string[];
  lead?: Note[];
  /** Noise sweep through the last two bars into the next section. */
  riser?: boolean;
  /** Low boom on the section's first downbeat. */
  impact?: boolean;
  /** 0..0.5: delay of the off-16ths as a fraction of a 16th. */
  swing?: number;
}

export interface Note {
  /** 16th index within the section. */
  step: number;
  /** Length in 16ths. */
  len: number;
  /** "A2", "C#3", "Bb1". */
  note: string;
  vel?: number;
}

export type Voice = "kick" | "snare" | "hat" | "clap" | "bass" | "chord" | "lead" | "impact";

export interface Hit {
  t: number;
  voice: Voice;
  vel: number;
}

export interface Rendered {
  samples: Float32Array;
  sampleRate: number;
  /** Ground truth, seconds. */
  beats: number[];
  downbeats: number[];
  hits: Hit[];
}

interface Event {
  at: number;
  voice: Voice;
  vel: number;
  /** Hz, for pitched voices. */
  freq: number;
  /** Samples, for pitched voices. */
  len: number;
  open: boolean;
}

interface Ctx {
  sr: number;
  seed: number;
  drums: Float64Array;
  music: Float64Array;
  lead: Float64Array;
  fx: Float64Array;
}

const TWO_PI = Math.PI * 2;
const PEAK = Math.pow(10, -1 / 20);

export function synthesize(song: Song): Rendered {
  const sr = song.sampleRate ?? 44100;
  const beatsPerBar = song.beatsPerBar ?? 4;
  const seed = song.seed ?? 1;
  const sixteenth = 60 / song.bpm / 4;
  const stepsPerBar = 4 * beatsPerBar;
  const leadIn = song.leadIn ?? 0;

  const beats: number[] = [];
  const downbeats: number[] = [];
  const hits: Hit[] = [];
  const events: Event[] = [];
  const risers: { from: number; to: number }[] = [];

  let sectionStart = leadIn;
  for (const section of song.sections) {
    const steps = section.bars * stepsPerBar;
    const swing = section.swing ?? 0;
    const stepTime = (step: number) => sectionStart + step * sixteenth + (step % 2 ? swing * sixteenth : 0);
    const push = (voice: Voice, t: number, vel: number, freq = 0, len = 0, open = false) => {
      events.push({ at: Math.round(t * sr), voice, vel, freq, len, open });
      hits.push({ t, voice, vel });
    };

    for (let bar = 0; bar < section.bars; bar++) {
      for (let b = 0; b < beatsPerBar; b++) {
        const t = sectionStart + (bar * stepsPerBar + b * 4) * sixteenth;
        beats.push(t);
        if (b === 0) downbeats.push(t);
      }
    }
    for (const voice of ["kick", "snare", "hat", "clap"] as const) {
      const pattern = section[voice];
      if (!pattern) continue;
      for (let step = 0; step < steps; step++) {
        const c = pattern[step % pattern.length];
        if (c === "x") push(voice, stepTime(step), 1);
        else if (c === "o") push(voice, stepTime(step), 0.55);
        else if (c === "O") push(voice, stepTime(step), voice === "hat" ? 0.85 : 1, 0, 0, voice === "hat");
      }
    }
    for (const n of section.bass ?? []) push("bass", stepTime(n.step), n.vel ?? 1, noteFreq(n.note), Math.round(n.len * sixteenth * sr));
    for (const n of section.lead ?? []) push("lead", stepTime(n.step), n.vel ?? 1, noteFreq(n.note), Math.round(n.len * sixteenth * sr));
    if (section.chords?.length) {
      for (let bar = 0; bar < section.bars; bar++) {
        const chord = section.chords[bar % section.chords.length];
        const t = sectionStart + bar * stepsPerBar * sixteenth;
        const len = Math.round(stepsPerBar * sixteenth * sr);
        const notes = chordNotes(chord);
        for (const midi of notes) events.push({ at: Math.round(t * sr), voice: "chord", vel: 1, freq: midiFreq(midi), len, open: false });
        if (notes.length) hits.push({ t, voice: "chord", vel: 1 });
      }
    }
    if (section.impact) push("impact", sectionStart, 1);
    const sectionEnd = sectionStart + steps * sixteenth;
    if (section.riser) risers.push({ from: Math.max(sectionStart, sectionEnd - 2 * stepsPerBar * sixteenth), to: sectionEnd });
    sectionStart = sectionEnd;
  }

  const tail = 0.5;
  const total = Math.round((sectionStart + tail) * sr);
  const ctx: Ctx = { sr, seed, drums: new Float64Array(total), music: new Float64Array(total), lead: new Float64Array(total), fx: new Float64Array(total) };

  events.sort((a, b) => a.at - b.at || a.voice.localeCompare(b.voice) || a.freq - b.freq);
  for (const ev of events) VOICES[ev.voice](ev, ctx);
  for (const r of risers) renderRiser(ctx, Math.round(r.from * sr), Math.round(r.to * sr));

  // Pluck echo: a dotted-8th feedback delay on the lead bus, then the lead joins the music bus.
  const delay = Math.round(0.75 * 4 * sixteenth * sr);
  for (let i = delay; i < total; i++) ctx.lead[i] += 0.38 * ctx.lead[i - delay];
  for (let i = 0; i < total; i++) ctx.music[i] += ctx.lead[i];

  // Sidechain: every kick ducks the music bus.
  const duck = new Float64Array(total).fill(1);
  const duckTau = 0.11 * sr;
  const duckLen = Math.round(4 * duckTau);
  for (const ev of events) {
    if (ev.voice !== "kick") continue;
    for (let i = 0; i < duckLen && ev.at + i < total; i++) {
      const g = 1 - 0.42 * ev.vel * Math.exp(-i / duckTau);
      if (g < duck[ev.at + i]) duck[ev.at + i] = g;
    }
  }

  const mix = new Float64Array(total);
  for (let i = 0; i < total; i++) mix[i] = ctx.drums[i] + ctx.music[i] * duck[i] + ctx.fx[i];
  return { samples: master(mix), sampleRate: sr, beats, downbeats, hits: hits.sort((a, b) => a.t - b.t) };
}

/** DC block, peak-normalise, gentle tanh clip, then peak at −1 dBFS. */
function master(mix: Float64Array): Float32Array {
  const n = mix.length;
  const a = 0.9985;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < n; i++) {
    const y = mix[i] - x1 + a * y1;
    x1 = mix[i];
    y1 = y;
    mix[i] = y;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const out = new Float32Array(n);
  if (peak === 0) return out;
  const k = 1.2;
  const norm = Math.tanh(k);
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.tanh((k * mix[i]) / peak) / norm;
    mix[i] = v;
    clipped = Math.max(clipped, Math.abs(v));
  }
  const g = PEAK / clipped;
  for (let i = 0; i < n; i++) out[i] = mix[i] * g;
  return out;
}

export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// ---------------------------------------------------------------- pitch

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteMidi(name: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim());
  if (!m) throw new Error(`bad note "${name}"`);
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1].toUpperCase()] + acc;
}

const midiFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const noteFreq = (name: string) => midiFreq(noteMidi(name));

const CHORD_QUALITIES: Record<string, number[]> = {
  "": [0, 4, 7],
  maj: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
};

/** "Am7" → midi notes at octave 3; "A3 C4 E4" → those notes; "." / "-" / "" → none. */
export function chordNotes(chord: string): number[] {
  const s = chord.trim();
  if (s === "" || s === "." || s === "-") return [];
  if (/\s/.test(s) || /^[A-Ga-g][#b]?-?\d+$/.test(s)) return s.split(/\s+/).map(noteMidi);
  const m = /^([A-Ga-g])([#b]?)(.*)$/.exec(s);
  if (!m) throw new Error(`bad chord "${chord}"`);
  const quality = CHORD_QUALITIES[m[3]];
  if (!quality) throw new Error(`unknown chord quality "${m[3]}" in "${chord}"`);
  const root = noteMidi(`${m[1]}${m[2]}3`);
  return quality.map((i) => root + i);
}

// ---------------------------------------------------------------- DSP bits

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VOICE_ID: Record<Voice, number> = { kick: 1, snare: 2, hat: 3, clap: 4, bass: 5, chord: 6, lead: 7, impact: 8 };

function eventRng(ctx: Ctx, ev: Event): () => number {
  let h = (ctx.seed * 0x9e3779b1) ^ (VOICE_ID[ev.voice] * 0x85ebca6b) ^ Math.imul(ev.at + 1, 0xc2b2ae35) ^ Math.imul(Math.round(ev.freq * 100) + 1, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
  return mulberry32(h ^ (h >>> 16));
}

/** Simper's trapezoidal state-variable filter: stable at any cutoff. */
class Svf {
  private ic1 = 0;
  private ic2 = 0;
  private g = 0;
  private k = 1;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  low = 0;
  band = 0;
  high = 0;
  constructor(private readonly sr: number) {}
  set(fc: number, q: number) {
    const f = Math.min(fc, this.sr * 0.49);
    this.g = Math.tan((Math.PI * f) / this.sr);
    this.k = 1 / q;
    this.a1 = 1 / (1 + this.g * (this.g + this.k));
    this.a2 = this.g * this.a1;
    this.a3 = this.g * this.a2;
    return this;
  }
  tick(x: number) {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.band = v1;
    this.high = x - this.k * v1 - v2;
  }
}

/** PolyBLEP sawtooth, phase in [0,1), dt = phase increment per sample. */
function saw(phase: number, dt: number): number {
  let v = 2 * phase - 1;
  if (phase < dt) {
    const t = phase / dt;
    v -= t + t - t * t - 1;
  } else if (phase > 1 - dt) {
    const t = (phase - 1) / dt;
    v -= t * t + t + t + 1;
  }
  return v;
}

const add = (bus: Float64Array, at: number, i: number, v: number) => {
  const j = at + i;
  if (j < bus.length) bus[j] += v;
};

/** A one-shot voice's last 12 ms fade to zero, so a tail still above silence does not end in a click. */
const tailFade = (i: number, n: number, sr: number) => Math.min(1, (n - i) / (0.012 * sr));

// ---------------------------------------------------------------- voices

const VOICES: Record<Voice, (ev: Event, ctx: Ctx) => void> = { kick, snare, hat, clap, bass, chord, lead, impact };

function kick(ev: Event, ctx: Ctx) {
  const { sr, drums } = ctx;
  const rng = eventRng(ctx, ev);
  const n = Math.round(0.5 * sr);
  const tau = 0.028;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const phase = TWO_PI * (46 * t + (175 - 46) * tau * (1 - Math.exp(-t / tau)));
    const env = Math.min(1, t / 0.0012) * (0.75 * Math.exp(-t / 0.23) + 0.35 * Math.exp(-t / 0.045));
    let v = Math.sin(phase) * env;
    v = Math.tanh(2.2 * v) / Math.tanh(2.2);
    const noise = rng() * 2 - 1;
    const click = (noise - prev) * 0.5 * Math.exp(-t / 0.0025);
    prev = noise;
    add(drums, ev.at, i, (v + 0.35 * click) * 0.95 * ev.vel * tailFade(i, n, sr));
  }
}

function snare(ev: Event, ctx: Ctx) {
  const { sr, drums } = ctx;
  const rng = eventRng(ctx, ev);
  const n = Math.round(0.32 * sr);
  const hp = new Svf(sr).set(1100, 0.7);
  const lp = new Svf(sr).set(7500, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const drop = 1 + 0.35 * Math.exp(-t / 0.02);
    const tone = 0.55 * Math.sin(TWO_PI * 182 * drop * t) * Math.exp(-t / 0.065) + 0.3 * Math.sin(TWO_PI * 331 * drop * t) * Math.exp(-t / 0.04);
    hp.tick(rng() * 2 - 1);
    lp.tick(hp.high);
    const noise = lp.low * Math.exp(-t / 0.1) * 0.9;
    const env = Math.min(1, t / 0.0008) * tailFade(i, n, sr);
    add(drums, ev.at, i, (tone + noise) * env * 0.72 * ev.vel);
  }
}

const HAT_PARTIALS = [3520, 4680, 5940, 7390, 8720, 10430];

function hat(ev: Event, ctx: Ctx) {
  const { sr, drums } = ctx;
  const rng = eventRng(ctx, ev);
  const tau = ev.open ? 0.14 : 0.024;
  const n = Math.round(tau * 7 * sr);
  const hp = new Svf(sr).set(6500, 0.8);
  const partials = HAT_PARTIALS.filter((f) => f < sr * 0.45);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let metal = 0;
    for (const f of partials) metal += Math.sin(TWO_PI * f * t);
    metal /= partials.length;
    hp.tick(rng() * 2 - 1);
    const v = (0.65 * hp.high + 0.5 * metal) * Math.exp(-t / tau) * Math.min(1, t / 0.0005);
    add(drums, ev.at, i, v * 0.3 * ev.vel);
  }
}

function clap(ev: Event, ctx: Ctx) {
  const { sr, drums } = ctx;
  const rng = eventRng(ctx, ev);
  const n = Math.round(0.3 * sr);
  const bp = new Svf(sr).set(1600, 1.1);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const burst = t < 0.033 ? Math.exp(-((t % 0.011) / 0.004)) : Math.exp(-(t - 0.033) / 0.09);
    bp.tick(rng() * 2 - 1);
    add(drums, ev.at, i, bp.band * burst * 1.3 * ev.vel * tailFade(i, n, sr));
  }
}

function bass(ev: Event, ctx: Ctx) {
  const { sr, music } = ctx;
  const release = Math.round(0.03 * sr);
  const n = ev.len + release;
  const dt = ev.freq / sr;
  const lp = new Svf(sr);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    lp.set(110 + 760 * Math.exp(-t / 0.11), 1.1);
    const osc = saw(phase, dt) + 0.7 * Math.sin(Math.PI * phase);
    phase += dt;
    if (phase >= 1) phase -= 1;
    lp.tick(osc);
    const env = Math.min(1, t / 0.003) * (i < ev.len ? 1 : 1 - (i - ev.len) / release);
    const v = Math.tanh(1.6 * lp.low) * env;
    add(music, ev.at, i, v * 0.5 * ev.vel);
  }
}

const DETUNE = [-9, 0, 9].map((c) => Math.pow(2, c / 1200));

function chord(ev: Event, ctx: Ctx) {
  const { sr, music } = ctx;
  const release = Math.round(0.14 * sr);
  const attack = 0.07;
  const n = ev.len + release;
  const dts = DETUNE.map((d) => (ev.freq * d) / sr);
  const phases = [0.17, 0.52, 0.81];
  const lp = new Svf(sr).set(1500, 0.6);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let osc = 0;
    for (let k = 0; k < 3; k++) {
      osc += saw(phases[k], dts[k]);
      phases[k] += dts[k];
      if (phases[k] >= 1) phases[k] -= 1;
    }
    lp.tick(osc / 3);
    const env = Math.min(1, t / attack) * (i < ev.len ? 1 : 1 - (i - ev.len) / release);
    add(music, ev.at, i, lp.low * env * 0.11 * ev.vel);
  }
}

function lead(ev: Event, ctx: Ctx) {
  const { sr } = ctx;
  const release = Math.round(0.04 * sr);
  const n = ev.len + release;
  const dt = ev.freq / sr;
  const lp = new Svf(sr);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    lp.set(320 + 5200 * Math.exp(-t / 0.075), 1.3);
    const osc = saw(phase, dt);
    phase += dt;
    if (phase >= 1) phase -= 1;
    lp.tick(osc);
    const env = Math.min(1, t / 0.0015) * (0.35 + 0.65 * Math.exp(-t / 0.22)) * (i < ev.len ? 1 : 1 - (i - ev.len) / release);
    add(ctx.lead, ev.at, i, lp.low * env * 0.34 * ev.vel);
  }
}

function impact(ev: Event, ctx: Ctx) {
  const { sr, fx } = ctx;
  const rng = eventRng(ctx, ev);
  const n = Math.round(1.3 * sr);
  const tau = 0.07;
  const lp = new Svf(sr).set(2500, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const phase = TWO_PI * (38 * t + (95 - 38) * tau * (1 - Math.exp(-t / tau)));
    const boom = Math.sin(phase) * Math.exp(-t / 0.55) * Math.min(1, t / 0.002);
    lp.tick(rng() * 2 - 1);
    const burst = lp.low * Math.exp(-t / 0.03);
    add(fx, ev.at, i, (boom * 0.85 + burst * 0.5) * ev.vel * tailFade(i, n, sr));
  }
}

function renderRiser(ctx: Ctx, from: number, to: number) {
  const { sr, fx } = ctx;
  const rng = mulberry32((ctx.seed ^ Math.imul(from + 7, 0x9e3779b1)) >>> 0);
  const bp = new Svf(sr);
  const len = to - from;
  const fadeOut = Math.round(0.003 * sr);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    bp.set(220 * Math.pow(6500 / 220, u), 2.2);
    bp.tick(rng() * 2 - 1);
    const fade = len - i < fadeOut ? (len - i) / fadeOut : 1;
    add(fx, from, i, bp.band * u * u * 0.6 * fade);
  }
}
