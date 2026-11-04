import { describe, expect, it } from "vitest";
import { musicGrid, sceneMusic, type MusicGrid } from "../src/audio/grid.js";
import type { BeatAnalysis } from "../src/audio/analyze.js";
import { audioElement, type BuildResult } from "../src/build/build.js";
import type { Music } from "../src/audio/music.js";
import { lintTimeline } from "../src/lint/timeline.js";
import { MotionBuilder } from "../src/motion/dsl.js";
import { musicStop, parseStoryboard, sceneTimings } from "../src/spec/storyboard.js";

/** A 120 bpm track: a beat every 0.5s from `first`, a bar every 4 beats, a strong hit on each bar. */
function track(first = 0, beats = 64): BeatAnalysis {
  const b = Array.from({ length: beats }, (_, i) => Math.round((first + i * 0.5) * 1000) / 1000);
  return {
    sampleRate: 22050,
    duration: first + beats * 0.5,
    bpm: 120,
    beatsPerBar: 4,
    beats: b,
    downbeats: b.filter((_, i) => i % 4 === 0),
    onsets: b.map((t, i) => ({ t, strength: i % 4 === 0 ? 1 : 0.2, band: "low" as const })),
    envelope: { hop: 0.01, values: [] },
  };
}

const sb = (scenes: unknown[], extra: Record<string, unknown> = {}) => ({
  title: "t",
  format: { aspect: "16:9", fps: 30 },
  music: { src: "assets/music.wav" },
  scenes,
  ...extra,
});
const scene = (id: string, duration: unknown, more: Record<string, unknown> = {}) => ({ id, duration, intent: "test scene", ...more });

describe("music grid", () => {
  it("puts the track on the video's clock: start shifts it, offset skips into it", () => {
    const g = musicGrid(track(0.25), { start: 1, offset: 0.25 });
    expect(g.beats[0]).toBe(1);
    expect(g.beats[1]).toBe(1.5);
    expect(g.bars[1]).toBe(3);
    expect(g.hits.every((h) => h.strength >= 0.35)).toBe(true);
    expect(g.span).toEqual([1, 33]);
  });

  it("re-clocks a scene's slice to the scene", () => {
    const m = sceneMusic(musicGrid(track(), { start: 0, offset: 0 }), 2, 2, 30);
    expect(m.beats).toEqual([0, 0.5, 1, 1.5, 2]);
    expect(m.bars).toEqual([0, 2]);
  });
});

describe("storyboard timed by the music", () => {
  const grid = musicGrid(track(), { start: 0, offset: 0 });

  it("a scene of N beats ends on the beat, transitions included", () => {
    const r = parseStoryboard(sb([scene("a", { beats: 4 }, { transition: { type: "crossfade", duration: 0.4 } }), scene("b", { bars: 1 }), scene("c", 1)]), { grid });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenes.map((s) => s.duration)).toEqual([2.4, 2, 1]);
    expect(sceneTimings(r.value).scenes.map((s) => s.start)).toEqual([0, 2, 4]);
    expect(r.value.scenes[0].span).toEqual({ beats: 4 });
  });

  it("after a scene timed in seconds, a beat-timed scene still cuts on the beat", () => {
    const r = parseStoryboard(sb([scene("a", 1.3), scene("b", { beats: 4 }), scene("c", 1)]), { grid });
    if (!r.ok) throw new Error(r.issues.join("\n"));
    const t = sceneTimings(r.value).scenes;
    expect(t[2].start).toBe(3.5); // b starts at 1.3 (nearest beat 1.5), ends 4 beats later
  });

  it("story beats sit on the scene's beats, bars and hits", () => {
    const r = parseStoryboard(
      sb([scene("a", 1), scene("b", { bars: 2 }, { beats: [{ id: "one", at: { beat: 2 } }, { id: "half", at: { beat: 2.5 } }, { id: "bar", at: { bar: 1 } }, { id: "hit", at: { hit: 0 } }] })]),
      { grid },
    );
    if (!r.ok) throw new Error(r.issues.join("\n"));
    // b starts at 1.0: its beats are at 1.0, 1.5, 2.0 …; its first bar at 2.0. The half beat at
    // 2.25s is halfway between frames 67 and 68: it takes the earlier (picture before sound).
    expect(Object.fromEntries(r.value.scenes[1].beats.map((b) => [b.id, b.at]))).toEqual({ one: 1, half: 1.2333, bar: 3, hit: 1 });
  });

  it("a beat-timed cut lands on the frame nearest the beat, never after that frame's time", () => {
    for (const first of [0.002, 0.0667, 0.0151]) {
      const g = musicGrid(track(first), { start: 0, offset: 0 });
      const r = parseStoryboard(sb([scene("a", { beats: 4 }), scene("b", { beats: 3 }), scene("c", 1)]), { grid: g });
      if (!r.ok) throw new Error(r.issues.join("\n"));
      const starts = sceneTimings(r.value).scenes.map((s) => s.start).slice(1);
      [first + 2, first + 3.5].forEach((beat, i) => {
        const frame = Math.round(beat * 30);
        expect(starts[i]).toBeLessThanOrEqual(frame / 30);
        expect(starts[i]).toBeGreaterThan((frame - 1) / 30);
      });
    }
  });

  it("refuses beat timing without music", () => {
    const r = parseStoryboard(sb([scene("a", { beats: 4 })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join()).toMatch(/no music/);
  });
});

describe("motion on the music", () => {
  const music = sceneMusic(musicGrid(track(), { start: 0, offset: 0 }), 1, 4, 30);

  it("a move on a beat starts on the frame nearest it, like the cut: on the cut it is seen on the cut's frame", () => {
    // The beat is at 3.867s; the scene before ends on its nearest frame, 116/30 = 3.8666s.
    const g = musicGrid(track(0.367), { start: 0, offset: 0 });
    const r = parseStoryboard(sb([scene("a", { beats: 8 }), scene("b", { beats: 4 }, { beats: [{ id: "in", at: { beat: 0 } }, { id: "and", at: { beat: 1 } }] })]), { grid: g });
    if (!r.ok) throw new Error(r.issues.join("\n"));
    const start = sceneTimings(r.value).scenes[1].start;
    expect(start).toBe(3.8666);
    expect(Object.fromEntries(r.value.scenes[1].beats.map((b) => [b.id, b.at]))).toEqual({ in: 0, and: 0.5 });
    const m = new MotionBuilder("b", 2, {}, undefined, undefined, undefined, sceneMusic(g, start, 2, 30));
    expect(m.time("beat:0")).toBe(0);
    expect(m.time("beat:1")).toBe(0.5);
  });

  it("beat:, bar: and hit: are counted from the scene's start", () => {
    const m = new MotionBuilder("s", 4, {}, undefined, undefined, undefined, music);
    expect(m.time("beat:0")).toBe(0);
    expect(m.time("beat:2")).toBe(1);
    expect(m.time("beat:2.5")).toBe(1.2333); // 1.25 is between frames; the earlier one
    expect(m.time("beat:2-0.05")).toBe(0.95);
    expect(m.time("bar:0")).toBe(1); // the scene starts at 1.0; the bar at 2.0
    expect(m.time("hit:0")).toBe(1);
  });

  it("snap moves a start to the nearest beat, half beat or bar", () => {
    const m = new MotionBuilder("s", 4, {}, undefined, undefined, undefined, music);
    m.enter("a", "fade", { at: 0.93, snap: "beat" });
    m.enter("b", "fade", { at: 0.7, snap: "half" });
    m.enter("c", "fade", { at: 0.7, snap: "bar" });
    expect(m.tweens.map((t) => t.start)).toEqual([1, 0.7333, 1]); // 0.75 is between frames; the earlier one
  });

  it("asks for music when there is none", () => {
    const m = new MotionBuilder("s", 4, {});
    expect(() => m.time("beat:1")).toThrow(/needs music/);
    expect(() => m.enter("a", "fade", { snap: "beat" })).toThrow(/needs music/);
  });
});

describe("lint on the music", () => {
  const grid: MusicGrid = musicGrid(track(), { start: 0, offset: 0 });
  const build = (starts: number[], tweenAt: number): BuildResult =>
    ({
      ok: true,
      slug: "t",
      dir: "",
      elements: [],
      partsEstimate: {},
      findings: [],
      hash: "",
      music: { grid } as BuildResult["music"],
      timeline: {
        version: 1,
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 8,
        scenes: starts.map((start, i) => ({
          scene: `s${i}`,
          start,
          duration: (starts[i + 1] ?? 8) - start,
          beats: {},
          loops: [],
          tweens: i === 0 ? [{ target: "s0.a", kind: "enter" as const, start: tweenAt, duration: 0.3, ease: { type: "linear" as const }, props: { opacity: [0, 1] as [number, number] } }] : [],
        })),
      },
    }) as BuildResult;

  it("a cut between beats warns; a cut on one does not", () => {
    const off = lintTimeline(build([0, 2.2], 0)).filter((f) => f.rule === "cut-off-beat");
    expect(off).toHaveLength(1);
    expect(off[0].severity).toBe("warning");
    expect(lintTimeline(build([0, 2], 0)).filter((f) => f.rule === "cut-off-beat")).toHaveLength(0);
  });

  it("a cut is judged where it shows: 2 ms after the beat is a whole frame late", () => {
    expect(lintTimeline(build([0, 2.002], 0)).filter((f) => f.rule === "cut-off-beat")).toHaveLength(1);
    expect(lintTimeline(build([0, 1.999], 0)).filter((f) => f.rule === "cut-off-beat")).toHaveLength(0);
  });

  it("a move two frames off a beat is a near miss; on it, or far off it, is fine", () => {
    const rules = (at: number) => lintTimeline(build([0, 2], at)).filter((f) => f.rule === "off-beat").length;
    expect(rules(1 + 2 / 30)).toBe(1);
    expect(rules(1)).toBe(0);
    expect(rules(1.25)).toBe(0);
  });
});

// Muxes with ffmpeg, which is in the toolchain image (CT_SLOW=1), not the plain unit-test runner.
describe.skipIf(process.env.CT_SLOW !== "1")("render QC hears the music where the picture put it (av-sync)", () => {
  it("passes a muxed track in sync and fails one delayed by 100 ms", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { synthesize, encodeWav } = await import("../src/audio/synth.js");
    const { analyzePcm } = await import("../src/audio/analyze.js");
    const { ffmpeg } = await import("../src/cli/lib/ffmpeg.js");
    const { avSync } = await import("../src/cli/lib/beats.js");
    const song = synthesize({ bpm: 120, seed: 3, sections: [{ bars: 3, kick: "x...x...x...x...", clap: "....x.......x...", hat: "..x...x...x...x." }] });
    const dir = mkdtempSync(join(tmpdir(), "ct-av-"));
    const wav = join(dir, "music.wav");
    writeFileSync(wav, encodeWav(song.samples, song.sampleRate));
    const grid = musicGrid(analyzePcm(song.samples, song.sampleRate), { start: 0, offset: 0 });
    const b = { timeline: { fps: 30, duration: 5.5 }, music: { grid } } as unknown as BuildResult;
    const mux = async (delayMs: number) => {
      const out = join(dir, `av-${delayMs}.mp4`);
      const r = await ffmpeg(["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=320x180:r=30:d=5.5", "-i", wav, "-af", `adelay=${delayMs}:all=1`, "-c:v", "libx264", "-c:a", "aac", "-shortest", out]);
      expect(r.code, r.stderr).toBe(0);
      return avSync(out, b);
    };
    const inSync = await mux(0);
    expect(Math.abs(inSync.offset!)).toBeLessThanOrEqual(1 / 30);
    expect(inSync.findings.map((f) => f.severity)).toEqual(["info"]);
    const late = await mux(100);
    expect(late.offset!).toBeGreaterThan(0.08);
    expect(late.offset!).toBeLessThan(0.12);
    expect(late.findings[0]).toMatchObject({ rule: "av-sync", severity: "error" });
  });
});

describe("music.stop", () => {
  const grid = musicGrid(track(), { start: 0, offset: 0 });
  const music = (stop: unknown) => ({ music: { src: "assets/music.wav", stop } });
  const stopOf = (stop: unknown, scenes = [scene("a", 2.01), scene("end", 3)]) => {
    const r = parseStoryboard(sb(scenes, music(stop)), { grid });
    if (!r.ok) return r.issues;
    return musicStop(r.value, grid);
  };

  it("stops on the frame the cut into a scene is seen", () => {
    expect(stopOf({ scene: "end" })).toEqual({ at: 2.0333 });
  });

  it("stops at seconds into a scene, or on a beat of it", () => {
    expect(stopOf({ scene: "end", at: 0.5 })).toEqual({ at: 2.5333 });
    // The scene starts at 2.01; its beat 0 is the first at or after that (2.5), beat 1 is 3.
    expect(stopOf({ scene: "end", at: { beat: 1 } })).toEqual({ at: 3 });
    expect(stopOf(4.2)).toEqual({ at: 4.2 });
  });

  it("names a scene that does not exist, or a stop outside the music", () => {
    expect(stopOf({ scene: "outro" })).toEqual(['music.stop: there is no scene "outro"']);
    expect(stopOf(9)).toEqual([expect.stringContaining("not while the music plays")]);
  });

  it("cuts the clip at the stop with a de-click, or the fade asked for", () => {
    const m = (spec: Record<string, unknown>) => ({ spec: { src: "assets/music.wav", start: 0, offset: 0, volume: 1, beatsPerBar: 4, ...spec }, file: "", analysis: track(), grid, stopAt: 2.0333 }) as Music;
    expect(audioElement(m({}), 5)).toContain('data-duration="2.033" data-volume="1" data-fade-out="0.01"');
    expect(audioElement(m({ fadeOut: 0.4 }), 5)).toContain('data-fade-out="0.4"');
    expect(audioElement({ ...m({}), stopAt: undefined }, 5)).not.toContain("data-fade-out");
  });
});
