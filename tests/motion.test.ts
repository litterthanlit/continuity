import { describe, expect, it } from "vitest";
import { MotionBuilder, staggerOffsets } from "../src/motion/dsl.js";
import { cubicBezier, easeFn, isLinear, springPosition, springSettleTime } from "../src/motion/easing.js";
import { compileScene, formatCounter, mergeVariationSettings, resolveScene, sampleScene, styleOf } from "../src/motion/evaluate.js";
import { bounceOf, eases, readTime, spring, visualOf } from "../src/motion/tokens.js";
import { transitionTweens } from "../src/motion/transitions.js";
import { parseEnergy } from "../src/cli/lib/energy.js";
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

  it("litt's ease-out covers most distance early", () => {
    const f = easeFn(eases.out);
    expect(f(0.3)).toBeGreaterThan(0.4);
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

  it("litt's springs: visual time + bounce, converted the way Motion does", () => {
    // responsive: visual 0.2s, bounce 0 — critically damped, settles in ≈ 0.35s, never overshoots
    expect(springSettleTime(eases.responsive)).toBeCloseTo(0.353, 2);
    expect(bounceOf(eases.responsive)).toBe(0);
    // expressive: visual 0.35s, bounce 0.12 — settles in ≈ 0.58s, peaks well under a pixel per 100
    expect(springSettleTime(eases.expressive)).toBeCloseTo(0.582, 2);
    let peak = 0;
    for (let t = 0; t < 1.5; t += 0.001) peak = Math.max(peak, springPosition(eases.expressive, t));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.005);
    // any spring's bounce and visual time can be read back
    expect(bounceOf({ type: "spring", stiffness: 300, damping: 15, mass: 1 })).toBeGreaterThan(0.5);
    expect(visualOf({ type: "spring", stiffness: eases.expressive.stiffness, damping: eases.expressive.damping, mass: 1 })).toBeCloseTo(0.35, 3);
    expect(spring(0.35, 0.12)).toEqual(eases.expressive);
  });

  it("detects linear curves", () => {
    expect(isLinear({ type: "linear" })).toBe(true);
    expect(isLinear({ type: "bezier", p: [0.3, 0.3, 0.7, 0.7] })).toBe(true);
    expect(isLinear(eases.out)).toBe(false);
  });
});

describe("dsl", () => {
  it("resolves beats, offsets, end and after:", () => {
    const m = new MotionBuilder("s", 4, { b1: 0.5 });
    expect(m.time("b1")).toBe(0.5);
    expect(m.time("b1+0.25")).toBe(0.75);
    expect(m.time("end-1")).toBe(3);
    m.enter("title", "rise", { at: "b1" });
    expect(m.time("after:title")).toBeCloseTo(0.5 + 0.353);
    expect(() => m.time("nope")).toThrow(/Unknown beat/);
  });

  it("staggers multiple targets with list spacing", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter(["a", "b", "c"], "rise", { at: 1 });
    expect(m.tweens.map((t) => t.start)).toEqual([1, 1.04, 1.08]);
    expect(m.tweens[0].target).toBe("s.a");
  });

  it("split tweens carry stagger metadata and masks for mask presets", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter("h", "maskUp", { split: "lines" });
    expect(m.tweens[0]).toMatchObject({ split: "lines", mask: true, stagger: { each: 0.08, name: "line" } });
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

  it("a click's ring stays hidden until the click, then opens and fades", () => {
    const m = new MotionBuilder("s", 4, {});
    m.click("cursor", { at: 2 });
    const c = compileScene(scene(m), {});
    expect(sampleScene(c, 0).get("s.cursor-ripple")!.opacity).toBe(0);
    expect(sampleScene(c, 1.99).get("s.cursor-ripple")!.opacity).toBe(0);
    expect(sampleScene(c, 2.1).get("s.cursor-ripple")!.opacity).toBeCloseTo(0.8);
    expect(sampleScene(c, 3).get("s.cursor-ripple")!.opacity).toBe(0);
  });

  it("inherits from-values across enter → exit", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter("a", "rise", { at: 0 });
    m.exit("a", "liftOut", { at: 2 });
    const resolved = resolveScene(scene(m), {});
    const exit = resolved.find((r) => r.kind === "exit")!;
    expect(exit.props.y).toEqual([0, -16]);
    expect(exit.props.opacity).toEqual([1, 0]);
  });

  it("entrances travel litt's 32px on springs; exits run 0.75× the entrance, ease out, no bounce", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter("a", "rise", { at: 0 });
    m.exit("a", "fadeOut", { at: 2 });
    m.enter("b", "settle", { at: 0 });
    m.exit("b", "scaleOut", { at: 2 });
    m.exit("c", "fadeOut", { at: 2 });
    const [ra, xa, rb, xb, xc] = m.tweens;
    expect(ra).toMatchObject({ props: { y: [32, 0] }, easeName: "responsive", duration: 0.353 });
    expect(xa).toMatchObject({ easeName: "out", duration: 0.15 });
    expect(rb).toMatchObject({ easeName: "expressive", props: { scale: [0.98, 1] } });
    expect(xb.duration).toBe(0.26);
    expect(xc.duration).toBe(0.26); // no entrance declared: the expressive exit
  });

  it("a camera origin holds that point still while the camera scales about the centre", () => {
    const m = new MotionBuilder("s", 3, {}, undefined, undefined, { width: 1080, height: 1920 });
    m.camera({ scale: [1, 1.03] }, { origin: { x: 86.4, y: 520 } });
    const { x, y } = m.tweens[0].props;
    expect(x![0]).toBe(0);
    expect(x![1]).toBeCloseTo((540 - 86.4) * 0.03, 4);
    expect(y![1]).toBeCloseTo((960 - 520) * 0.03, 4);
    // the anchor's screen position: centre + (anchor − centre) × scale + translation = anchor
    expect(540 + (86.4 - 540) * 1.03 + x![1]).toBeCloseTo(86.4, 4);
  });

  it("ink steps between the grey and fg at the instant tier", () => {
    const m = new MotionBuilder("s", 2, {});
    m.emphasize("w", "ink", { at: 0.5 });
    expect(m.tweens[0]).toMatchObject({ props: { ink: [0, 1] }, duration: 0.1, easeName: "out" });
    expect(styleOf({ ink: 0.5 }).color).toBe("color-mix(in oklab, var(--color-fg) 50%, var(--color-fg-muted))");
    expect(styleOf({ ink: 1 }).color).toBe("color-mix(in oklab, var(--color-fg) 100%, var(--color-fg-muted))");
  });

  it("expands split parts with staggered starts", () => {
    const m = new MotionBuilder("s", 4, {});
    m.enter("h", "rise", { split: "words", at: 0.5 });
    const r = resolveScene(scene(m), { "s.h": { words: 3 } });
    expect(r.map((x) => [x.key, x.start])).toEqual([
      ["s.h::0", 0.5],
      ["s.h::1", 0.54],
      ["s.h::2", 0.58],
    ]);
  });

  it("is deterministic", () => {
    const m = new MotionBuilder("s", 3, {});
    m.enter("a", "settle", { at: 0.2 });
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

describe("variable font axes", () => {
  it("maps font channels to font-weight, font-stretch and variation axes", () => {
    expect(styleOf({ wght: 650.4, wdth: 87.5 })).toEqual({ fontWeight: "650.4", fontStretch: "87.5%" });
    expect(styleOf({ soft: 40, opsz: 72 })).toEqual({ fontVariation: { SOFT: 40, opsz: 72 } });
    expect(styleOf({ wght: 2000, wdth: 10 })).toEqual({ fontWeight: "1000", fontStretch: "50%" });
  });

  it("merges animated axes over the settled settings (kit axes survive)", () => {
    expect(mergeVariationSettings('"SOFT" 100, "WONK" 1', { SOFT: 37.5 })).toBe('"SOFT" 37.5, "WONK" 1');
    expect(mergeVariationSettings("normal", { opsz: 72 })).toBe('"opsz" 72');
    expect(mergeVariationSettings("normal", {})).toBe("normal");
  });

  it("inherited from-values and loops start at the element's font base, not 400", () => {
    const mb = new MotionBuilder("s", 3, {}, undefined, () => ({ values: { wght: 600, wdth: 100 }, ranges: { wght: [200, 900], wdth: [75, 125] } }));
    mb.tween("t", { wght: [null, 800] }, { at: 0.5, duration: 0.4 });
    mb.loop("u", { wdth: 10 }, { period: 2 });
    const sc = { ...scene(mb), bases: { "s.t": { wght: 600 }, "s.u": { wdth: 100 } } };
    expect(resolveScene(sc, {})[0].props.wght).toEqual([600, 800]);
    const c = compileScene(sc, {});
    expect(sampleScene(c, 0).get("s.t")!.wght).toBe(600);
    expect(sampleScene(c, 0.5).get("s.u")!.wdth).toBeCloseTo(100 + 10 * Math.sin(Math.PI / 2), 6);
  });

});

describe("transitions", () => {
  it("place outgoing tweens at the end of the outgoing scene", () => {
    const t = transitionTweens({ type: "push", duration: 0.5 }, { id: "a", duration: 3 }, { id: "b" });
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

describe("motion energy", () => {
  it("keeps the exponent of near-zero energies (a still hold is not a jolt)", () => {
    const text = "frame:1 pts:1 pts_time:15.3\nlavfi.signalstats.YAVG=0\nframe:2 pts:2 pts_time:15.3333\nlavfi.signalstats.YAVG=6.94444e-05\nframe:3 pts:3 pts_time:15.3667\nlavfi.signalstats.YAVG=12.5\n";
    expect(parseEnergy(text)).toEqual([[15.3, 0], [15.3333, 6.94444e-5], [15.3667, 12.5]]);
  });
});
