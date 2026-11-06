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
    // Settled, the ink is the plain token: the contrast audit cannot read a color-mix (Chrome computes it as oklab()).
    expect(styleOf({ ink: 1 }).color).toBe("var(--color-fg)");
    expect(styleOf({ ink: 0 }).color).toBe("var(--color-fg-muted)");
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

  // A phrase types as a run of one-key tweens; its deletion is the tween that starts at the phrase's last key.
  const keysOf = (m: MotionBuilder, from: number, to: number) =>
    m.tweens.filter((t) => {
      const [a, b] = t.props.typed ?? [null, 0];
      return a !== null && a >= from && b <= to && b - a === 1;
    });
  const deletion = (m: MotionBuilder, at: number) => m.tweens.find((t) => t.props.typed && t.props.typed[0] === at && t.props.typed[1] - t.props.typed[0] > 1)!;

  it("holds each phrase long enough to read before deleting it, and keeps the last", () => {
    const m = new MotionBuilder("s", 6, {});
    m.retype("end", tape, { at: 0.5, cps: 20, caret: "caret" });
    const keys = keysOf(m, 0, 10);
    expect(keys).toHaveLength(10);
    expect(keys[0]).toMatchObject({ target: "s.end", start: 0.5, tape });
    const typed = keys[9].start + keys[9].duration;
    expect(typed).toBeCloseTo(1, 3);
    const del0 = deletion(m, 10);
    expect(del0.start - (0.5 + 0.3 * (typed - 0.5))).toBeGreaterThanOrEqual(readTime(10) - 1e-9);
    expect(del0.start - typed).toBeGreaterThanOrEqual(0.6);
    expect(del0.props.typed).toEqual([10, 20]);
    expect(del0.duration).toBe(0.2);
    const second = keysOf(m, 20, 33);
    expect(second[0].start).toBeCloseTo(del0.start + del0.duration + 0.1, 6);
    const last = second[second.length - 1];
    expect(m.loops.map((l) => [l.start, l.end])).toEqual([
      [round(typed), del0.start],
      [round(last.start + last.duration), null],
    ]);
  });

  it("lands a phrase with its own at and deletes the one before just in time", () => {
    const m = new MotionBuilder("s", 6, { b2: 3 });
    m.retype("end", ["ranking #1", { text: "booking demos", at: "b2" }], { cps: 20 });
    const del0 = deletion(m, 10);
    expect(round(del0.start + del0.duration + 0.1)).toBe(3);
    expect(keysOf(m, 20, 33)[0].start).toBe(3);
  });

  it("types with a person's cadence: uneven keys, a beat before each word, the phrase on time", () => {
    const m = new MotionBuilder("s", 6, {});
    m.retype("end", ["booking demos"], { at: 0, cps: 13 });
    const keys = keysOf(m, 0, 13).map((t) => t.duration);
    expect(new Set(keys).size).toBeGreaterThan(5);
    // "booking demos": the space is key 7, the "d" after it key 8.
    const mean = keys.reduce((a, b) => a + b, 0) / keys.length;
    expect(keys[8]).toBeGreaterThan(mean);
    expect(keys.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 2);
  });

  it("refuses a phrase that would start before the one before it is typed", () => {
    const m = new MotionBuilder("s", 6, {});
    expect(() => m.retype("end", ["ranking #1", { text: "booking", at: 0.2 }])).toThrow(/finishes typing|before the phrase before/);
  });

  it("with accent, types each phrase in the accent and settles it to ink once typed", () => {
    const m = new MotionBuilder("s", 6, {});
    m.retype("end", tape, { at: 0.5, cps: 20, accent: true });
    const c = compileScene(scene(m), {});
    const color = (t: number) => styleOf(sampleScene(c, t).get("s.end")!).color;
    expect(color(0.7)).toBe("var(--color-accent-text)");
    expect(color(1.9)).toBe("var(--color-fg)");
    const second = m.tweens.find((t) => t.props.typed && t.props.typed[0] === 20)!;
    expect(color(second.start + 0.05)).toBe("var(--color-accent-text)");
  });

  it("types a field with a caret by its content, so the caret follows the last key", () => {
    const m = new MotionBuilder("s", 3, {}, undefined, undefined, undefined, undefined, (t) => (t === "s.site-text" ? { caret: "s.site-caret", tape: "harbor.dev" } : undefined));
    m.type("site-text", { at: 0.5, cps: 20 });
    const c = compileScene(scene(m), {});
    const text = (t: number) => styleOf(sampleScene(c, t).get("s.site-text")!, undefined, undefined, c.tapes.get("s.site-text")).text;
    expect(text(0.4)).toBe("");
    const mid = text(0.75)!;
    expect(mid.length).toBeGreaterThan(1);
    expect(mid.length).toBeLessThan(10);
    expect("harbor.dev".startsWith(mid)).toBe(true);
    expect(text(2.9)).toBe("harbor.dev");
    expect(m.loops.map((l) => l.target)).toEqual(["s.site-caret"]);
    expect(m.loops[0].start).toBeCloseTo(1, 3);
    // A line with no caret still types by opacity, character by character.
    const plain = new MotionBuilder("s", 3, {}).type("l0", { at: 0 });
    expect(plain.tweens[0]).toMatchObject({ preset: "typeOn", split: "chars" });
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

  it("with a before, keeps every cell on show and lights its after over it", () => {
    const m = new MotionBuilder("s", 3, {}, undefined, undefined, undefined, undefined, (t) => (t === "s.g" ? { ...data["s.g"], from: "1" } : data[t]));
    m.grid("g", "fill", { at: 0.5, span: 0.4 });
    expect(m.tweens.map((t) => t.target)).toEqual([0, 1, 2, 3, 4, 5].map((i) => `s.g-${i}-to`));
    const before = sampleScene(compileScene(scene(m), {}), 0.4);
    expect(before.get("s.g-0")).toBeUndefined();
    expect(before.get("s.g-0-to")!.opacity).toBe(0);
  });

  it("grows each cell from a dot into its square, the dot leading the swell", () => {
    const m = grid().grid("g", "grow", { at: 0.5, span: 0.4 });
    const c = compileScene(scene(m), {});
    const at = (t: number) => sampleScene(c, t).get("s.g-0")!;
    expect(at(0.62)).toMatchObject({ radius: 50, opacity: 1 });
    expect(at(0.62).scale).toBeCloseTo(0.3, 2);
    expect(at(2.9)).toMatchObject({ radius: 18, scale: 1 });
    // The last column is still a dot when the first has finished swelling.
    expect(at(1.0).scale).toBeGreaterThan(0.9);
    expect(sampleScene(c, 1.0).get("s.g-5")!.scale).toBeLessThan(0.35);
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

describe("pullBack", () => {
  // A 1400×820 Browser, centred in a 1920×1080 frame: its screen is the 1400×740 body below an 80px bar.
  const m = () => new MotionBuilder("s", 3, {}, undefined, undefined, undefined, undefined, (t) => (t === "s.browser" ? { screen: "0 40 1400 740" } : undefined));
  const cam = (b: MotionBuilder, t: number) => sampleScene(compileScene(scene(b), {}), t).get("s.camera")!;
  // Where the camera puts a frame point: about the frame's centre, scaled, then translated.
  const place = (v: ReturnType<typeof cam>, x: number, y: number) => [960 + v.x! + v.scale! * (x - 960), 540 + v.y! + v.scale! * (y - 540)];

  it("opens with the screen covering the frame, then flies back to the whole device", () => {
    const b = m().pullBack("browser", { at: 0.5 });
    const start = cam(b, 0);
    const [left, top] = place(start, 960 - 700, 540 - 410 + 80);
    const [right, bottom] = place(start, 960 + 700, 540 + 410);
    expect(top).toBeCloseTo(0, 0);
    expect(bottom).toBeCloseTo(1080, 0);
    expect(left).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(1920);
    expect(cam(b, 2.9)).toMatchObject({ scale: 1, x: 0, y: 0 });
    expect(b.tweens[0].allow).toContain("camera-too-fast");
  });

  it("names the frames it can pull back from", () => {
    expect(() => m().pullBack("card")).toThrow(/Window>, <Browser> or <Phone/);
  });
});

describe("zoom path", () => {
  // The bench film's macro: 1 → 15.43× with the pan that centres its target, over 1.4s on inOut.
  const zoom = () => {
    const m = new MotionBuilder("s", 3, {});
    m.camera({ scale: [1, 15.4303], x: [0, 3285.0788], y: [0, -1327.0026] }, { at: 0.2, duration: 1.4, ease: "inOut" });
    return compileScene(scene(m), {});
  };

  it("zooms as the ease says: perceived progress (log scale) follows the ease", () => {
    const c = zoom();
    const ease = easeFn(eases.inOut);
    for (const p of [0.2, 1 / 3, 0.5, 0.8]) {
      const v = sampleScene(c, 0.2 + 1.4 * p).get("s.camera")!.scale!;
      expect(Math.log(v) / Math.log(15.4303)).toBeCloseTo(ease(p), 3);
    }
    // Interpolating scale linearly front-loads it: 42% of the zoom in the first third, where the ease asks for 15%.
    const linear = 1 + 14.4303 * ease(1 / 3);
    expect(Math.log(linear) / Math.log(15.4303)).toBeGreaterThan(0.4);
    expect(sampleScene(c, 1.6).get("s.camera")!.scale).toBeCloseTo(15.4303, 4);
  });

  it("carries the target straight to the centre", () => {
    const c = zoom();
    // The target sits where the end framing centres it: d = -T1 / s1 from the origin.
    const d = [-3285.0788 / 15.4303, 1327.0026 / 15.4303];
    const at = (t: number) => {
      const v = sampleScene(c, t).get("s.camera")!;
      return [v.x! + v.scale! * d[0], v.y! + v.scale! * d[1]];
    };
    for (const t of [0.5, 0.9, 1.3]) {
      const [x, y] = at(t);
      // On the line from its start (d) to the centre (0, 0): the cross product vanishes.
      expect(Math.abs(x * d[1] - y * d[0]) / Math.hypot(...d)).toBeLessThan(0.5);
    }
    const end = at(1.6);
    expect(Math.hypot(end[0], end[1])).toBeLessThan(0.5);
  });
});

describe("shutter blur", () => {
  it("smears a fast move along its path and leaves it sharp at rest; a calm rise is never blurred", () => {
    const m = new MotionBuilder("s", 3, {});
    m.tween("card", { x: [-160, 0], opacity: [0, 1] }, { at: 0.5, duration: "snap", ease: "steep", kind: "enter" });
    m.enter("title", "rise", { at: 0.5 });
    const c = compileScene(scene(m), {});
    expect([...c.shutter]).toEqual(["s.card"]);
    const card = (t: number) => sampleScene(c, t).get("s.card")!;
    const mid = card(0.65);
    expect(mid.blurX!).toBeGreaterThan(5);
    expect(mid.blurY).toBe(0);
    expect(card(0.4).blurX).toBe(0);
    expect(card(1.5).blurX).toBe(0);
    expect(styleOf(mid).motionBlur![0]).toBeGreaterThan(5);
  });
});

describe("additive offsets, impulse, paint", () => {
  const lin = easeFn({ type: "linear" });
  void lin;
  const tl = (tweens: Array<{ target: string; props: Record<string, [number, number]>; duration: number }>): SceneTimeline => ({
    scene: "a",
    start: 0,
    duration: 2,
    beats: {},
    loops: [],
    tweens: tweens.map((t) => ({ kind: "move" as const, start: 0, ease: { type: "linear" as const }, ...t })),
  });
  const transformAt = (s: SceneTimeline, key: string, t: number) => styleOf(sampleScene(compileScene(s, {}), t).get(key)!).transform;

  it("shift adds to x: an element's own move and a handoff compose", () => {
    const s = tl([
      { target: "a.el", props: { x: [0, 100] }, duration: 1 },
      { target: "a.el", props: { shiftX: [0, 40] }, duration: 1 },
    ]);
    expect(transformAt(s, "a.el", 0.5)).toContain("translate3d(70px,0px,0px)");
  });

  it("impulse leaves at rest, starts at 27/4 slope, peaks at a third", () => {
    const e = easeFn({ type: "impulse" });
    expect(e(0)).toBe(0);
    expect(e(1)).toBeCloseTo(0, 9);
    expect(e(1 / 3)).toBeCloseTo(1, 9);
    expect(e(1e-4) / 1e-4).toBeCloseTo(27 / 4, 2);
  });

  it("an impulse comes back to rest and stays there after its tween", () => {
    const s = tl([{ target: "a.el", props: { shiftX: [0, 100] }, duration: 0.6 }]);
    s.tweens[0].ease = { type: "impulse" };
    const c = compileScene(s, {});
    expect(sampleScene(c, 0.2).get("a.el")!.shiftX).toBeCloseTo(100, 6);
    for (const t of [0.6, 0.61, 1.5]) expect(sampleScene(c, t).get("a.el")!.shiftX, String(t)).toBe(0);
  });

  it("the shutter sees a fast shift", () => {
    const c = compileScene(tl([{ target: "a.el", props: { shiftX: [0, 600] }, duration: 0.3 }]), {});
    expect(c.shutter.has("a.el")).toBe(true);
  });

  it("the shutter smears by the speed on screen, whatever the element's own scale (its filter is drawn scaled)", () => {
    const blurAt = (scale: number) => {
      const s = tl([
        { target: "a.el", props: { shiftX: [0, 600] }, duration: 0.3 },
        { target: "a.el", props: { scale: [scale, scale] }, duration: 0.3 },
      ]);
      return sampleScene(compileScene(s, {}), 0.15).get("a.el")!.blurX!;
    };
    expect(blurAt(1)).toBeGreaterThan(1);
    // At a quarter size the filter is drawn at a quarter: its σ is four times as large in the element's own px.
    expect(blurAt(0.25)).toBeCloseTo(4 * blurAt(1), 6);
  });

  it("the shutter is at full speed on a move's first frame (a match cut's frame 0)", () => {
    // Constant speed: the blur is the same on the first frame, mid-move and on the last.
    const c = compileScene(tl([{ target: "a.el", props: { x: [0, 600] }, duration: 0.3 }]), {});
    const mid = sampleScene(c, 0.15).get("a.el")!.blurX!;
    expect(mid).toBeGreaterThan(1);
    for (const t of [0, 0.3 - 1e-6]) expect(sampleScene(c, t).get("a.el")!.blurX!, String(t)).toBeCloseTo(mid, 6);
  });

  it("paint mixes two fills; corner is px", () => {
    const s = styleOf({ paint: 0.25, corner: 12 }, undefined, undefined, undefined, ["#000000", "#ffffff"]);
    expect(s.backgroundColor).toBe("color-mix(in oklab, #ffffff 25%, #000000)");
    expect(s.borderRadius).toBe("12px");
  });

  it("a paint tween carries its colour pair into the compiled scene", () => {
    const s = tl([{ target: "a.el", props: { paint: [0, 1] }, duration: 1 }]);
    s.tweens[0].paint = ["#111111", "#eeeeee"];
    expect(compileScene(s, {}).paints.get("a.el")).toEqual(["#111111", "#eeeeee"]);
  });
});
