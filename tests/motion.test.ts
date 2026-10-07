import { describe, expect, it } from "vitest";
import { MotionBuilder, staggerOffsets } from "../src/motion/dsl.js";
import { cubicBezier, easeFn, isLinear, springPosition, springSettleTime } from "../src/motion/easing.js";
import { compileScene, formatCounter, resolveScene, sampleScene, styleOf } from "../src/motion/evaluate.js";
import { eases, readTime } from "../src/motion/tokens.js";
import { transitionTweens } from "../src/motion/transitions.js";
import type { SceneTimeline } from "../src/motion/types.js";

const scene = (mb: MotionBuilder): SceneTimeline => ({
  scene: mb.scene,
  start: 0,
  duration: mb.duration,
  beats: mb.beats,
  tweens: mb.tweens,
  loops: mb.loops,
});

describe("easing", () => {
  it("cubic bezier hits endpoints and is monotonic for standard curves", () => {
    const f = cubicBezier(0.2, 0, 0, 1);
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    let prev = 0;
    for (let p = 0.01; p <= 1; p += 0.01) {
      const v = f(p);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it("matches known CSS ease values", () => {
    // CSS `ease` = cubic-bezier(.25,.1,.25,1); at 50% ≈ 0.8024
    expect(cubicBezier(0.25, 0.1, 0.25, 1)(0.5)).toBeCloseTo(0.8024, 3);
    // ease-in-out (.42,0,.58,1) is symmetric
    expect(cubicBezier(0.42, 0, 0.58, 1)(0.5)).toBeCloseTo(0.5, 4);
  });

  it("decelerating entrance covers most distance early", () => {
    const f = easeFn(eases.enter);
    expect(f(0.3)).toBeGreaterThan(0.6);
  });

  it("springs start at 0, settle at 1, and bouncy overshoots", () => {
    const p = { stiffness: 300, damping: 15, mass: 1 };
    expect(springPosition(p, 0)).toBe(0);
    expect(springPosition(p, 5)).toBeCloseTo(1, 3);
    let max = 0;
    for (let t = 0; t < 2; t += 0.005) max = Math.max(max, springPosition(p, t));
    expect(max).toBeGreaterThan(1.05);
    const over = { stiffness: 100, damping: 60, mass: 1 };
    for (let t = 0; t < 3; t += 0.01) expect(springPosition(over, t)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("spring settle times are sane", () => {
    const snappy = springSettleTime(eases.snappy);
    expect(snappy).toBeGreaterThan(0.2);
    expect(snappy).toBeLessThan(1);
  });

  it("detects linear curves", () => {
    expect(isLinear({ type: "linear" })).toBe(true);
    expect(isLinear({ type: "bezier", p: [0.3, 0.3, 0.7, 0.7] })).toBe(true);
    expect(isLinear(eases.enter)).toBe(false);
  });
});

describe("dsl", () => {
  it("resolves beats, offsets, end and after:", () => {
    const m = new MotionBuilder("s", 4, { b1: 0.5 });
    expect(m.time("b1")).toBe(0.5);
    expect(m.time("b1+0.25")).toBe(0.75);
    expect(m.time("end-1")).toBe(3);
    m.enter("title", "rise", { at: "b1" });
    expect(m.time("after:title")).toBeCloseTo(0.5 + 0.64);
    expect(() => m.time("nope")).toThrow(/Unknown beat/);
  });

  it("staggers multiple targets with list spacing", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter(["a", "b", "c"], "rise", { at: 1 });
    expect(m.tweens.map((t) => t.start)).toEqual([1, 1.08, 1.16]);
    expect(m.tweens[0].target).toBe("s.a");
  });

  it("split tweens carry stagger metadata and masks for mask presets", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter("h", "maskUp", { split: "lines" });
    expect(m.tweens[0]).toMatchObject({ split: "lines", mask: true, stagger: { each: 0.09, name: "line" } });
  });

  it("stagger offsets by origin", () => {
    expect(staggerOffsets(5, 0.1, "start")).toEqual([0, 0.1, 0.2, 0.3, 0.4]);
    expect(staggerOffsets(5, 0.1, "end")).toEqual([0.4, 0.3, 0.2, 0.1, 0]);
    expect(staggerOffsets(5, 0.1, "center")).toEqual([0.2, 0.1, 0, 0.1, 0.2]);
  });
});

describe("evaluate", () => {
  it("holds `from` before start, interpolates, then holds `to`", () => {
    const m = new MotionBuilder("s", 3, {});
    m.tween("a", { x: [100, 0] }, { at: 1, duration: 1, ease: "linear" });
    const c = compileScene(scene(m), {});
    expect(sampleScene(c, 0).get("s.a")!.x).toBe(100);
    expect(sampleScene(c, 1.5).get("s.a")!.x).toBeCloseTo(50);
    expect(sampleScene(c, 2.5).get("s.a")!.x).toBe(0);
  });

  it("inherits from-values across enter → exit", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter("a", "rise", { at: 0 });
    m.exit("a", "sinkOut", { at: 2 });
    const resolved = resolveScene(scene(m), {});
    const exit = resolved.find((r) => r.kind === "exit")!;
    expect(exit.props.y).toEqual([0, -24]);
    expect(exit.props.opacity).toEqual([1, 0]);
  });

  it("expands split parts with staggered starts", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter("h", "rise", { split: "words", at: 0.5 });
    const r = resolveScene(scene(m), { "s.h": { words: 3 } });
    expect(r.map((x) => [x.key, x.start])).toEqual([
      ["s.h::0", 0.5],
      ["s.h::1", 0.56],
      ["s.h::2", 0.62],
    ]);
  });

  it("is deterministic", () => {
    const m = new MotionBuilder("s", 3, {});
    m.enter("a", "scalePop", { at: 0.2 });
    m.loop("a", { y: 6 }, { period: 3 });
    const c1 = compileScene(scene(m), {});
    const c2 = compileScene(scene(m), {});
    for (const t of [0, 0.31, 1.7, 2.99]) {
      expect(styleOf(sampleScene(c1, t).get("s.a")!)).toEqual(styleOf(sampleScene(c2, t).get("s.a")!));
    }
  });

  it("emits css only for animated channels", () => {
    expect(styleOf({ opacity: 0.5 })).toEqual({ opacity: "0.5" });
    expect(styleOf({ y: 10 }).transform).toBe("translate3d(0px,10px,0px)");
    expect(styleOf({ clipRight: 40 }).clipPath).toBe("inset(0% 40% 0% 0%)");
  });

  it("formats counters", () => {
    expect(formatCounter(1234567.891, { decimals: 1, prefix: "$" })).toBe("$1,234,567.9");
    expect(formatCounter(42, { decimals: 0, suffix: "%", separator: "" })).toBe("42%");
  });
});

describe("transitions", () => {
  it("place outgoing tweens at the end of the outgoing scene", () => {
    const t = transitionTweens("push", 0.5, { id: "a", duration: 3 }, { id: "b" });
    expect(t.out[0]).toMatchObject({ target: "a.scene", start: 2.5, duration: 0.5 });
    expect(t.in[0]).toMatchObject({ target: "b.scene", start: 0 });
  });
});

describe("tokens", () => {
  it("read time grows with copy length and has a floor", () => {
    expect(readTime(5)).toBeCloseTo(0.83);
    expect(readTime(34)).toBeCloseTo(2.4);
  });
});
