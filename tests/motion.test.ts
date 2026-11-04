import { describe, expect, it } from "vitest";
import { MotionBuilder, round, staggerOffsets } from "../src/motion/dsl.js";
import { cubicBezier, easeFn, isLinear, springPosition, springSettleTime } from "../src/motion/easing.js";
import { compileScene, formatCounter, mergeVariationSettings, resolveScene, sampleScene, styleOf, tapeText } from "../src/motion/evaluate.js";
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
    expect(styleOf({ clipRight: 0 }).clipPath).toBe("none");
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

describe("whip and drift (energetic register)", () => {
  const at = (mb: MotionBuilder, t: number) => sampleScene(compileScene(scene(mb), {}), t);

  it("lands most of the travel in ~1.5 frames, then drifts the rest until the end", () => {
    const f = easeFn(eases.whip);
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    let prev = 0;
    for (let p = 0.005; p <= 1; p += 0.005) {
      expect(f(p)).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = f(p);
    }
    expect(f(0.05)).toBeGreaterThan(0.8); // 1.5 frames of the 1s drift
    expect(f(0.5)).toBeLessThan(0.97); // still drifting half way
  });

  it("keeps the snap at ~1.5 frames whatever the drift's length", () => {
    const mb = new MotionBuilder("s", 3, {});
    mb.tween("card", { x: [400, 0] }, { ease: "whip", duration: 2 });
    const x = at(mb, 0.05).get("s.card")!.x!;
    expect(x).toBeLessThan(400 * 0.2); // ≥ 80% of the way after 0.05s, though the tween lasts 2s
    expect(at(mb, 1).get("s.card")!.x!).toBeGreaterThan(1); // and it is still moving at 1s
  });

  it("the whip preset blurs only its snap, even when the call sets a long drift", () => {
    const mb = new MotionBuilder("s", 3, {});
    mb.enter("card", "whip", { dir: "up", duration: 1.6 });
    const move = mb.tweens.find((t) => t.props.y)!;
    expect(move.props.y).toEqual([160, 0]);
    expect(move.duration).toBe(1.6);
    const bell = mb.tweens.filter((t) => t.props.blurY);
    expect(bell.length).toBeGreaterThan(0);
    expect(Math.max(...bell.map((t) => t.start + t.duration))).toBeLessThanOrEqual(0.1);
  });

  it("is seen on its first frame, as a smear: on a cut it never opens on a blank frame", () => {
    const mb = new MotionBuilder("s", 3, {});
    mb.enter("card", "whip", { at: 0.5, dir: "left" });
    const c = compileScene(scene(mb), {});
    const first = sampleScene(c, 0.5).get("s.card")!;
    expect(first.opacity).toBe(1);
    expect(first.blurX).toBeGreaterThan(8); // the snap's blur, at its peak
    expect(sampleScene(c, 0.49).get("s.card")!.opacity).toBe(0); // and nothing before it
    expect(sampleScene(c, 0.6).get("s.card")!.blurX ?? 0).toBeLessThan(1); // sharp by the drift
  });
});

describe("squash and stretch", () => {
  it("stretches along a fast move, keeps the area, and is the identity at rest", () => {
    const mb = new MotionBuilder("s", 2, {});
    mb.tween("ball", { y: [-600, 0] }, { ease: "steep", duration: 0.5, squash: 0.3 });
    const c = compileScene(scene(mb), {});
    const mid = sampleScene(c, 0.25).get("s.ball")!.deform!;
    expect(mid[3]).toBeGreaterThan(1.15); // longer along y, the direction of travel
    expect(mid[0]).toBeLessThan(0.9); // thinner across it
    expect(mid[0] * mid[3] - mid[1] * mid[2]).toBeCloseTo(1, 6); // no growth: area kept
    const rest = sampleScene(c, 1.5).get("s.ball")!;
    expect(styleOf(rest).transform).not.toContain("matrix(");
    expect(styleOf(sampleScene(c, 0.25).get("s.ball")!).transform).toContain("matrix(");
  });

  it("squashes against the deceleration when a springy landing turns round", () => {
    const mb = new MotionBuilder("s", 2, {});
    mb.tween("ball", { y: [-300, 0] }, { ease: "pop", squash: 0.3 });
    const c = compileScene(scene(mb), {});
    // the overshoot's peak (the furthest past the landing): nearly still, decelerating hard
    let peak = { t: 0, y: -Infinity };
    for (let t = 0.05; t < 0.6; t += 1 / 240) {
      const y = sampleScene(c, t).get("s.ball")!.y!;
      if (y > peak.y) peak = { t, y };
    }
    expect(peak.y).toBeGreaterThan(0);
    const d = sampleScene(c, peak.t).get("s.ball")!.deform!;
    expect(d[3]).toBeLessThan(1);
  });
});

describe("retype", () => {
  const tape = ["ranking #1", "booking demos"];

  it("types a phrase, deletes it key by key, then types the next", () => {
    expect(tapeText(tape, 0)).toBe("");
    expect(tapeText(tape, 4)).toBe("rank");
    expect(tapeText(tape, 10)).toBe("ranking #1");
    expect(tapeText(tape, 13)).toBe("ranking");
    expect(tapeText(tape, 20)).toBe("");
    expect(tapeText(tape, 27)).toBe("booking");
    expect(tapeText(tape, 10.9)).toBe("ranking #1");
    expect(tapeText(tape, 99)).toBe("");
  });

  it("holds each phrase long enough to read before deleting it, and keeps the last", () => {
    const m = new MotionBuilder("s", 6, {});
    m.retype("end", tape, { at: 0.5, cps: 20, caret: "caret" });
    const [type0, del0, type1] = m.tweens;
    expect(m.tweens).toHaveLength(3);
    expect(type0).toMatchObject({ target: "s.end", start: 0.5, duration: 0.5, props: { typed: [0, 10] }, tape });
    const reading = del0.start - (type0.start + 0.3 * type0.duration);
    expect(reading).toBeGreaterThanOrEqual(readTime(10) - 1e-9);
    expect(del0.start - (type0.start + type0.duration)).toBeGreaterThanOrEqual(0.6);
    expect(del0.props.typed).toEqual([10, 20]);
    expect(del0.duration).toBe(0.2);
    expect(type1.start).toBeCloseTo(del0.start + del0.duration + 0.1, 6);
    expect(m.loops.map((l) => [l.start, l.end])).toEqual([
      [1, del0.start],
      [type1.start + type1.duration, null],
    ]);
  });

  it("lands a phrase with its own at and deletes the one before just in time", () => {
    const m = new MotionBuilder("s", 6, { b2: 3 });
    m.retype("end", ["ranking #1", { text: "booking demos", at: "b2" }], { cps: 20 });
    const del0 = m.tweens[1];
    expect(round(del0.start + del0.duration + 0.1)).toBe(3);
    expect(m.tweens[2].start).toBe(3);
  });

  it("refuses a phrase that would start before the one before it is typed", () => {
    const m = new MotionBuilder("s", 6, {});
    expect(() => m.retype("end", ["ranking #1", { text: "booking", at: 0.2 }])).toThrow(/finishes typing|before the phrase before/);
  });

  it("shows the tape's text through the compiled scene", () => {
    const m = new MotionBuilder("s", 6, {});
    m.retype("end", tape, { at: 0, cps: 10 });
    const c = compileScene(scene(m), {});
    const textAt = (t: number) => styleOf(sampleScene(c, t).get("s.end")!, undefined, undefined, c.tapes.get("s.end")).text;
    expect(textAt(0)).toBe("");
    expect(textAt(0.45)).toBe("rank");
    expect(textAt(1.2)).toBe("ranking #1");
    expect(textAt(5.9)).toBe("booking demos");
  });
});

describe("cycle and stackIn", () => {
  const withData = (data: Record<string, Record<string, string>>) => new MotionBuilder("s", 4, { b1: 1 }, undefined, undefined, undefined, undefined, (t) => data[t]);

  it("flips each word out as the next rises in, one step per time, and keeps the last", () => {
    const m = withData({ "s.tool": { count: "3" } });
    m.cycle("tool", { times: [0.5, "b1"] });
    const rows = m.tweens.map((t) => [t.target, t.kind, t.start, t.props.yPct]);
    expect(rows).toEqual([
      ["s.tool-0", "exit", 0.5, [0, -120]],
      ["s.tool-1", "enter", 0.5, [120, 0]],
      ["s.tool-1", "exit", 1, [0, -120]],
      ["s.tool-2", "enter", 1, [120, 0]],
    ]);
    expect(m.tweens[0].group).toBe(m.tweens[1].group);
  });

  it("names the component it needs when the target is not one", () => {
    expect(() => withData({}).cycle("tool")).toThrow(/not a <Cycle>/);
    expect(() => withData({ "s.alerts": { count: "2" } }).stackIn("alerts")).toThrow(/row pitch/);
  });

  it("moves the stack down a row as one while each notification rides in from the row above", () => {
    const m = withData({ "s.alerts": { count: "3", pitch: "148" } });
    m.stackIn("alerts", { at: 0.2, every: 0.6 });
    const c = compileScene(scene(m), {});
    const yAt = (i: number, t: number) => sampleScene(c, t).get(`s.alerts-${i}`)!.y!;
    expect(sampleScene(c, 0.5).get("s.alerts-2")!.opacity).toBe(0);
    // While only the first is in, the stack sits two rows up, so it shows at the top row.
    expect(yAt(0, 0.79)).toBeCloseTo(-296, 0);
    // Mid-step every card shares one offset from its layout row, so they keep their pitch: none crosses another.
    for (const t of [0.85, 0.9, 1.0, 1.45, 1.5]) expect(yAt(0, t)).toBeCloseTo(yAt(1, t), 6);
    for (const t of [1.45, 1.5]) expect(yAt(2, t)).toBeCloseTo(yAt(1, t), 6);
    for (const i of [0, 1, 2]) expect(yAt(i, 3.9)).toBeCloseTo(0, 3);
    expect(m.tweens.filter((t) => t.start === 1.4).map((t) => t.target)).toEqual(["s.alerts-2", "s.alerts-0", "s.alerts-1"]);
  });
});

describe("ring", () => {
  const ringed = () => new MotionBuilder("s", 3, {}, undefined, undefined, undefined, undefined, (t) => (t === "s.score" ? { value: "89", max: "100", suffix: "%" } : undefined));

  it("fills the arc and counts the number together, to the ring's own value", () => {
    const m = ringed();
    m.ring("score", { at: 0.4 });
    const c = compileScene(scene(m), {});
    for (const t of [0.4, 0.7, 1.1, 1.8, 2.5]) {
      const v = sampleScene(c, t);
      expect(v.get("s.score-arc")!.draw! * 100).toBeCloseTo(v.get("s.score")!.counter!, 6);
    }
    expect(sampleScene(c, 2.9).get("s.score")!.counter).toBeCloseTo(89, 6);
    expect(styleOf(sampleScene(c, 2.9).get("s.score")!, c.counters.get("s.score")).text).toBe("89%");
  });

  it("says what it needs when the target is not a ring", () => {
    expect(() => ringed().ring("other")).toThrow(/not a <Ring>/);
  });
});

describe("dot grid", () => {
  // 3 columns of 2 rows; cell i holds value i / 5.
  const data: Record<string, Record<string, string>> = { "s.g": { count: "6", rows: "2" } };
  for (let i = 0; i < 6; i++) data[`s.g-${i}`] = { v: String(i / 5) };
  const grid = () => new MotionBuilder("s", 3, {}, undefined, undefined, undefined, undefined, (t) => data[t]);
  const startOf = (m: MotionBuilder, i: number) => m.tweens.find((t) => t.target === `s.g-${i}`)!.start;

  it("fills column by column across the span, or corner to corner on a diagonal", () => {
    const left = grid().grid("g", "fill", { at: 0.5, span: 0.4 });
    expect([0, 1, 2, 3, 4, 5].map((i) => startOf(left, i))).toEqual([0.5, 0.5, 0.7, 0.7, 0.9, 0.9]);
    const diagonal = grid().grid("g", "fill", { at: 0, span: 0.3, wave: "diagonal" });
    expect([0, 1, 2, 3, 4, 5].map((i) => startOf(diagonal, i))).toEqual([0, 0.1, 0.1, 0.2, 0.2, 0.3]);
    expect(new Set(left.tweens.map((t) => t.group)).size).toBe(1);
  });

  it("turns each square into a circle sized by its value", () => {
    const m = grid().grid("g", "dots", { at: 0 });
    const c = compileScene(scene(m), {});
    const end = sampleScene(c, 2.9);
    expect(end.get("s.g-0")).toMatchObject({ radius: 50, scale: 0.3 });
    expect(end.get("s.g-5")!.scale).toBeCloseTo(1, 6);
    expect(styleOf(end.get("s.g-5")!).borderRadius).toBe("50%");
    expect(styleOf(sampleScene(c, 0).get("s.g-0")!).borderRadius).toBe("18%");
  });
});
