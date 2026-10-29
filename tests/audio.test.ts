import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeFile, analyzePcm, type BeatAnalysis } from "../src/audio/analyze.js";
import { chordNotes, encodeWav, noteMidi, synthesize, type Note, type Rendered, type Song } from "../src/audio/synth.js";

const line = (notes: [number, number, string][]): Note[] => notes.map(([step, len, note]) => ({ step, len, note }));

/** Repeat a phrase of `steps` 16ths across `bars` bars. */
const tile = (phrase: Note[], steps: number, bars: number): Note[] => {
  const out: Note[] = [];
  for (let at = 0; at < bars * 16; at += steps) for (const n of phrase) if (n.step + at < bars * 16) out.push({ ...n, step: n.step + at });
  return out;
};

/** A two-bar Am7 | Fmaj7 bed, ~30 s at the given tempo, in four-bar sections that alternate a plain groove with lead, claps, risers and impacts. */
function song(bpm: number, extra: Partial<Song> & { kick?: string; hat?: string; swing?: number } = {}): Song {
  const { kick = "x...x...x...x...", hat = "x.O.x.O.x.O.x.O.", swing, ...rest } = extra;
  const bars = Math.max(8, Math.ceil((30 * bpm) / 60 / 4));
  const bass = line([
    [0, 3, "A1"], [4, 2, "A1"], [6, 2, "A2"], [8, 4, "A1"], [12, 2, "G1"], [14, 2, "A1"],
    [16, 3, "F1"], [20, 2, "F1"], [22, 2, "F2"], [24, 4, "F1"], [28, 2, "E1"], [30, 2, "F1"],
  ]);
  const lead = line([
    [0, 2, "E4"], [3, 1, "A4"], [6, 2, "C5"], [10, 2, "B4"], [12, 3, "A4"],
    [16, 2, "C5"], [19, 1, "E5"], [22, 2, "D5"], [26, 2, "C5"], [28, 3, "A4"],
  ]);
  const sections: Song["sections"] = [];
  let left = bars;
  while (left > 0) {
    const n = Math.min(4, left);
    const odd = sections.length % 2 === 1;
    sections.push({
      bars: n,
      kick,
      snare: "....x.......x...",
      hat,
      clap: odd ? "....x.......x..." : undefined,
      bass: tile(bass, 32, n),
      chords: ["Am7", "Fmaj7"],
      lead: odd ? tile(lead, 32, n) : undefined,
      riser: odd && left - n > 0,
      impact: !odd,
      swing,
    });
    left -= n;
  }
  return { bpm, seed: 7, sections, ...rest };
}

const songs = {
  "90 bpm, four on the floor": song(90),
  "110 bpm, 0.37 s silent lead-in": song(110, { leadIn: 0.37 }),
  "124 bpm, 16th hats swung 0.12": song(124, { swing: 0.12, hat: "xoxoxoxoxoxoxoxo" }),
  "140 bpm, kick on beats 1 and 3 only": song(140, { kick: "x.......x......." }),
};
type Name = keyof typeof songs;

const rendered = new Map<Name, Rendered>();
const render = (name: Name) => {
  let r = rendered.get(name);
  if (!r) rendered.set(name, (r = synthesize(songs[name])));
  return r;
};

const TOLERANCE = 0.015;
const nearest = (ts: number[], t: number) => ts.reduce((best, x) => (Math.abs(x - t) < Math.abs(best) ? x - t : best), Infinity);

/** Every true beat after the first is detected within tolerance, and nothing else is reported as a beat. */
function expectBeatsToMatch(detected: number[], truth: number[], what = "beat") {
  const missed = truth.slice(1).filter((t) => Math.abs(nearest(detected, t)) > TOLERANCE);
  expect(missed, `${what}s missed`).toEqual([]);
  const extras = detected.filter((t) => Math.abs(nearest(truth, t)) > TOLERANCE);
  expect(extras, `extra ${what}s`).toEqual([]);
}

const maxErrorMs = (detected: number[], truth: number[]) => Math.max(...truth.slice(1).map((t) => Math.abs(nearest(detected, t)))) * 1000;

describe("beat analysis of synthesized tracks", () => {
  it("analyses a 30 s track in under 1.5 s", () => {
    const r = render("124 bpm, 16th hats swung 0.12");
    const cold = performance.now();
    analyzePcm(r.samples, r.sampleRate);
    const coldMs = performance.now() - cold;
    const warm = performance.now();
    analyzePcm(r.samples, r.sampleRate);
    const warmMs = performance.now() - warm;
    console.log(`analysis of ${(r.samples.length / r.sampleRate).toFixed(1)} s at ${r.sampleRate} Hz: cold ${coldMs.toFixed(0)} ms, warm ${warmMs.toFixed(0)} ms`);
    expect(coldMs).toBeLessThan(1500);
  });

  for (const name of Object.keys(songs) as Name[]) {
    it(`tracks tempo, beats and downbeats: ${name}`, () => {
      const r = render(name);
      const a = analyzePcm(r.samples, r.sampleRate);
      expect(Math.abs(a.bpm - songs[name].bpm)).toBeLessThanOrEqual(0.5);
      expectBeatsToMatch(a.beats, r.beats);
      expectBeatsToMatch(a.downbeats, r.downbeats, "downbeat");
      expect(a.beats[0]).toBeGreaterThanOrEqual(r.beats[0] - TOLERANCE);
      console.log(`${name}: bpm ${a.bpm}, max beat error ${maxErrorMs(a.beats, r.beats).toFixed(1)} ms over ${r.beats.length} beats`);
    });

    it(`finds every kick and snare within 15 ms: ${name}`, () => {
      const r = render(name);
      const a = analyzePcm(r.samples, r.sampleRate);
      const times = a.onsets.map((o) => o.t);
      for (const voice of ["kick", "snare"] as const) {
        const hits = r.hits.filter((h) => h.voice === voice).map((h) => h.t);
        const missed = hits.filter((t) => Math.abs(nearest(times, t)) > TOLERANCE);
        expect(missed, `${voice} hits without an onset`).toEqual([]);
        const worst = Math.max(...hits.map((t) => Math.abs(nearest(times, t)))) * 1000;
        console.log(`${name}: ${voice} ${hits.length}/${hits.length} found, max error ${worst.toFixed(1)} ms`);
      }
      expect(a.onsets.every((o, i) => i === 0 || o.t >= a.onsets[i - 1].t)).toBe(true);
      expect(Math.max(...a.onsets.map((o) => o.strength))).toBe(1);
    });
  }

  it("honours a forced bpm (half time) and still tracks phase", () => {
    const r = render("90 bpm, four on the floor");
    const a = analyzePcm(r.samples, r.sampleRate, { bpm: 45 });
    expect(Math.abs(a.bpm - 45)).toBeLessThanOrEqual(0.5);
    const extras = a.beats.filter((t) => Math.abs(nearest(r.beats, t)) > TOLERANCE);
    expect(extras).toEqual([]);
    expect(a.beats.length).toBeGreaterThanOrEqual(r.beats.length / 2 - 1);
    expect(a.beats.length).toBeLessThanOrEqual(r.beats.length / 2 + 1);
    const gaps = a.beats.slice(1).map((t, i) => t - a.beats[i]);
    for (const gap of gaps) expect(Math.abs(gap - (2 * 60) / 90)).toBeLessThanOrEqual(2 * TOLERANCE);
  });

  it("honours a forced first downbeat", () => {
    const r = render("140 bpm, kick on beats 1 and 3 only");
    const third = r.beats[2];
    const a = analyzePcm(r.samples, r.sampleRate, { firstDownbeat: third + 0.004 });
    const truth = r.beats.filter((_, i) => i % 4 === 2);
    expectBeatsToMatch(a.downbeats, truth, "downbeat");
    expect(Math.abs(a.downbeats[0] - third)).toBeLessThanOrEqual(TOLERANCE);
  });

  it("gives the same beats from a WAV decoded by ffmpeg as from the samples", async () => {
    const r = render("110 bpm, 0.37 s silent lead-in");
    const file = join(mkdtempSync(join(tmpdir(), "ct-audio-")), "song.wav");
    writeFileSync(file, encodeWav(r.samples, r.sampleRate));
    const fromFile = await analyzeFile(file);
    const fromPcm = analyzePcm(r.samples, r.sampleRate);
    expect(fromFile.beats.length).toBe(fromPcm.beats.length);
    fromFile.beats.forEach((t, i) => expect(Math.abs(t - fromPcm.beats[i])).toBeLessThanOrEqual(0.001));
    expect(fromFile.bpm).toBeCloseTo(fromPcm.bpm, 1);
    expect(fromFile.downbeats.length).toBe(fromPcm.downbeats.length);
    expect(Math.abs(fromFile.duration - fromPcm.duration)).toBeLessThan(0.002);
  });

  it("is deterministic", () => {
    const s = songs["124 bpm, 16th hats swung 0.12"];
    const a = synthesize(s);
    const b = synthesize(s);
    expect(encodeWav(a.samples, a.sampleRate).equals(encodeWav(b.samples, b.sampleRate))).toBe(true);
    expect(analyzePcm(a.samples, a.sampleRate)).toEqual(analyzePcm(b.samples, b.sampleRate));
  });

  it("returns an empty analysis for silence", () => {
    const a: BeatAnalysis = analyzePcm(new Float32Array(22050 * 5), 22050);
    expect(a.beats).toEqual([]);
    expect(a.downbeats).toEqual([]);
    expect(a.onsets).toEqual([]);
    expect(a.bpm).toBe(0);
    expect(a.duration).toBe(5);
  });
});

describe("synthesizer", () => {
  it("peaks at -1 dBFS, returns the beat grid and sample-accurate hits", () => {
    const r = render("124 bpm, 16th hats swung 0.12");
    let peak = 0;
    for (const v of r.samples) peak = Math.max(peak, Math.abs(v));
    expect(20 * Math.log10(peak)).toBeCloseTo(-1, 1);
    expect(r.beats.length).toBe(64);
    expect(r.downbeats).toEqual(r.beats.filter((_, i) => i % 4 === 0));
    expect(r.beats[1] - r.beats[0]).toBeCloseTo(60 / 124, 9);
    const hatsInBeat1 = r.hits.filter((h) => h.voice === "hat" && h.t < 60 / 124).map((h) => h.t);
    const sixteenth = 60 / 124 / 4;
    expect(hatsInBeat1.length).toBe(4);
    [0, 1.12, 2, 3.12].forEach((steps, i) => expect(hatsInBeat1[i]).toBeCloseTo(sixteenth * steps, 9));
  });

  it("writes a 16-bit mono WAV header ffmpeg accepts", () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1]), 8000);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(8000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(10);
    expect(wav.readInt16LE(44 + 2)).toBe(16384);
    expect(wav.readInt16LE(44 + 6)).toBe(32767);
    expect(wav.readInt16LE(44 + 8)).toBe(-32767);
  });

  it("parses notes and chords", () => {
    expect(noteMidi("A4")).toBe(69);
    expect(noteMidi("C#3")).toBe(49);
    expect(noteMidi("Bb1")).toBe(34);
    expect(chordNotes("Am7")).toEqual([57, 60, 64, 67]);
    expect(chordNotes("Fmaj7")).toEqual([53, 57, 60, 64]);
    expect(chordNotes("A3 C4 E4")).toEqual([57, 60, 64]);
    expect(chordNotes(".")).toEqual([]);
    expect(() => chordNotes("Hm")).toThrow();
  });
});
