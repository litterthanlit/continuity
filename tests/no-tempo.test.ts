import { describe, expect, it } from "vitest";
import type { BeatAnalysis } from "../src/audio/analyze.js";
import { musicGrid, sceneMusic } from "../src/audio/grid.js";
import { MotionBuilder } from "../src/motion/dsl.js";
import { parseStoryboard } from "../src/spec/storyboard.js";

/** What the analyser returns for silence, a pad or a short stinger: no tempo, no beats. */
const flat: BeatAnalysis = { sampleRate: 22050, duration: 4, bpm: 0, beatsPerBar: 4, beats: [], downbeats: [], onsets: [], envelope: { hop: 0.01, values: [] } };
const grid = musicGrid(flat, { start: 0, offset: 0 });
const sb = (scenes: unknown[]) => ({ title: "t", format: { aspect: "16:9", fps: 30 }, music: { src: "assets/music.wav" }, scenes });
const scene = (id: string, duration: unknown, more: Record<string, unknown> = {}) => ({ id, duration, intent: "test scene", ...more });

describe("a track with no tempo", () => {
  it("is a storyboard issue when a scene is counted in beats", () => {
    const r = parseStoryboard(sb([scene("a", { beats: 4 }), scene("b", 2)]), { grid });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.join("\n")).toMatch(/no tempo could be found/);
  });

  it("is a storyboard issue when a beat is counted on the music", () => {
    const r = parseStoryboard(sb([scene("a", 2, { beats: [{ id: "b1", at: { beat: 0 } }] })]), { grid });
    expect(r.ok).toBe(false);
  });

  it("is fine under scenes timed in seconds", () => {
    const r = parseStoryboard(sb([scene("a", 2, { beats: [{ id: "b1", at: 0.5 }] })]), { grid });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenes[0].duration).toBe(2);
  });

  it('makes "beat:0" in motion code an error, never a NaN start', () => {
    const m = new MotionBuilder("s", 2, {}, undefined, undefined, undefined, sceneMusic(grid, 0, 2, 30));
    expect(() => m.enter("x", "fade", { at: "beat:0" })).toThrow(/no tempo could be found/);
    expect(m.tweens).toEqual([]);
  });
});
