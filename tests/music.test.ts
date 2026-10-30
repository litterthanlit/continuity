import { describe, expect, it } from "vitest";
import { musicGrid, sceneMusic, type MusicGrid } from "../src/audio/grid.js";
import type { BeatAnalysis } from "../src/audio/analyze.js";
import type { BuildResult } from "../src/build/build.js";
import { lintTimeline } from "../src/lint/timeline.js";
import { MotionBuilder } from "../src/motion/dsl.js";
import { parseStoryboard, sceneTimings } from "../src/spec/storyboard.js";

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
    const m = sceneMusic(musicGrid(track(), { start: 0, offset: 0 }), 2, 2);
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
    // b starts at 1.0: its beats are at 1.0, 1.5, 2.0 …; its first bar at 2.0
    expect(Object.fromEntries(r.value.scenes[1].beats.map((b) => [b.id, b.at]))).toEqual({ one: 1, half: 1.25, bar: 3, hit: 1 });
  });

  it("refuses beat timing without music", () => {
    const r = parseStoryboard(sb([scene("a", { beats: 4 })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join()).toMatch(/no music/);
  });
});

describe("motion on the music", () => {
  const music = sceneMusic(musicGrid(track(), { start: 0, offset: 0 }), 1, 4);

  it("beat:, bar: and hit: are counted from the scene's start", () => {
    const m = new MotionBuilder("s", 4, {}, undefined, undefined, undefined, music);
    expect(m.time("beat:0")).toBe(0);
    expect(m.time("beat:2")).toBe(1);
    expect(m.time("beat:2.5")).toBe(1.25);
    expect(m.time("beat:2-0.05")).toBe(0.95);
    expect(m.time("bar:0")).toBe(1); // the scene starts at 1.0; the bar at 2.0
    expect(m.time("hit:0")).toBe(1);
  });

  it("snap moves a start to the nearest beat, half beat or bar", () => {
    const m = new MotionBuilder("s", 4, {}, undefined, undefined, undefined, music);
    m.enter("a", "fade", { at: 0.93, snap: "beat" });
    m.enter("b", "fade", { at: 0.7, snap: "half" });
    m.enter("c", "fade", { at: 0.7, snap: "bar" });
    expect(m.tweens.map((t) => t.start)).toEqual([1, 0.75, 1]);
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

  it("a move two frames off a beat is a near miss; on it, or far off it, is fine", () => {
    const rules = (at: number) => lintTimeline(build([0, 2], at)).filter((f) => f.rule === "off-beat").length;
    expect(rules(1 + 2 / 30)).toBe(1);
    expect(rules(1)).toBe(0);
    expect(rules(1.25)).toBe(0);
  });
});
