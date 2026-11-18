import { describe, expect, it } from "vitest";
import { MotionBuilder } from "../src/motion/dsl.js";
import { compileScene, sampleScene } from "../src/motion/evaluate.js";
import type { SceneTimeline } from "../src/motion/types.js";

const scene = (mb: MotionBuilder): SceneTimeline => ({ scene: mb.scene, start: 0, duration: mb.duration, beats: mb.beats, tweens: mb.tweens, loops: mb.loops });
const opacity = (m: MotionBuilder, id: string, t: number) => sampleScene(compileScene(scene(m), {}, 30), t).get(id)?.opacity;

describe("a loop with a window (frames are seeked, so every frame writes its value)", () => {
  it("rests at the base before its start and after its end", () => {
    const m = new MotionBuilder("s", 4, {});
    m.blink("caret", { at: 1, until: 2 });
    expect(opacity(m, "s.caret", 0.5)).toBe(1);
    expect(opacity(m, "s.caret", 2.5)).toBe(1);
    expect(opacity(m, "s.caret", 1.5)).not.toBeUndefined();
  });

  it("two windows on one element: between them and inside the second", () => {
    const m = new MotionBuilder("s", 6, {});
    m.blink("caret", { at: 1, until: 2 });
    m.blink("caret", { at: 4 });
    expect(opacity(m, "s.caret", 3)).toBe(1);
    const inside = [4.1, 4.3, 4.6, 4.8].map((t) => opacity(m, "s.caret", t));
    expect(inside.every((v) => v !== undefined)).toBe(true);
    expect(new Set(inside).size).toBeGreaterThan(1);
  });
});
