import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fxStyle } from "../src/motion/fx.js";
import { peakSlope, sigmaFor } from "../src/motion/easing.js";
import { eases } from "../src/motion/tokens.js";
import { LAYER_DEPTH, LAYER_TRAVEL, layerPlan } from "../src/motion/layers.js";
import { isCut, TRANSITION_DEFS, TRANSITIONS, transitionTweens, type TransitionSpec } from "../src/motion/transitions.js";
import { lintStoryboard } from "../src/lint/timeline.js";
import type { FxSpec } from "../src/motion/types.js";
import { parseStoryboard, type Storyboard } from "../src/spec/storyboard.js";

/** v1 transitions litt kept unchanged (crossfade and dip moved to litt's eases; the rest are gone). */
const LEGACY = ["cut", "push", "pushUp", "wipe"] as const;
const snapshot = JSON.parse(readFileSync(new URL("./golden/transitions-v1.json", import.meta.url), "utf8")) as Record<string, unknown>;
const run = (spec: Partial<TransitionSpec> & { type: TransitionSpec["type"] }, outDur = 3) =>
  transitionTweens({ duration: TRANSITION_DEFS[spec.type].duration, ...spec } as TransitionSpec, { id: "a", duration: outDur }, { id: "b" });

describe("kept transitions are unchanged (characterization, v1 snapshot)", () => {
  for (const t of LEGACY) {
    for (const d of [0.4, 0.5]) {
      it(`${t}@${d}`, () => {
        // JSON round trip: the snapshot has no undefined fields.
        expect(JSON.parse(JSON.stringify(transitionTweens({ type: t, duration: d }, { id: "a", duration: 3 }, { id: "b" })))).toEqual(snapshot[`${t}@${d}`]);
      });
    }
  }
  it("pushUp is push dir up; a parameterless wipe is the legacy inset wipe", () => {
    expect(run({ type: "pushUp" })).toEqual(run({ type: "push", dir: "up" }));
    expect(run({ type: "wipe" }).in[0].props).toEqual({ clipRight: [100, 0] });
  });
});

describe("every transition", () => {
  for (const type of TRANSITIONS) {
    it(`${type}: out ends with the outgoing scene, in stays inside [0, d], targets are scene layers`, () => {
      const d = TRANSITION_DEFS[type].duration;
      const t = run({ type });
      for (const tw of t.out) {
        expect(tw.start + tw.duration).toBeLessThanOrEqual(3 + 1e-6);
        expect(tw.start).toBeGreaterThanOrEqual(3 - d - 1e-6);
        expect(tw.target).toBe("a.scene");
      }
      for (const tw of t.in) {
        expect(tw.start).toBeGreaterThanOrEqual(0);
        expect(tw.start + tw.duration).toBeLessThanOrEqual(d + 1e-6);
        expect(["b.scene", "b.reveal", "b.fx"]).toContain(tw.target);
        expect(tw.kind).toBe("transition");
        if (tw.target === "b.fx" || tw.target === "b.reveal") expect(TRANSITION_DEFS[type].layers, `${type} needs layers`).toBeDefined();
      }
      expect(d).toBeGreaterThanOrEqual(TRANSITION_DEFS[type].range[0]);
      expect(d).toBeLessThanOrEqual(TRANSITION_DEFS[type].range[1]);
    });
  }
});

describe("litt's transition language", () => {
  it("is cuts, match cuts and carries plus four accents, pixels and depth for the energetic register, morph and portal; nothing that performs", () => {
    expect([...TRANSITIONS]).toEqual(["cut", "match", "carry", "crossfade", "dip", "push", "pushUp", "wipe", "pixels", "depth", "morph", "portal"]);
    expect(TRANSITIONS.filter((t) => isCut({ type: t }))).toEqual(["cut", "match", "carry"]);
    expect(TRANSITIONS.filter((t) => TRANSITION_DEFS[t].registers)).toEqual(["pixels", "depth"]);
  });

  it("match starts each paired element where its partner was, measured, and settles it after the cut", () => {
    const t = run({ type: "match", pairs: ["logo", ["word", "label"]] });
    expect(t.out).toEqual([]);
    expect(t.in.map((tw) => [tw.target, tw.start, tw.duration, tw.measure])).toEqual([
      ["b.logo", 0, 0.6, { kind: "match", from: "a.logo" }],
      ["b.label", 0, 0.6, { kind: "match", from: "a.word" }],
    ]);
  });

  it("pixels goes through the canvas: cells cover the outgoing scene, then uncover the incoming one", () => {
    const t = run({ type: "pixels" });
    const at = (target: string, prop: string) => t.in.concat(t.out).filter((tw) => tw.target === target && prop in tw.props).map((tw) => [tw.start, tw.duration, tw.props[prop as "fx"]]);
    expect(at("b.fx", "fx")).toEqual([[0, 0.25, [0, 1]]]);
    expect(at("b.fx", "opacity")).toEqual([[0, 0.25, [1, 0]]]);
    expect(at("b.reveal", "fx")).toEqual([[0.25, 0.25, [0, 1]]]);
    // A one-step ease: the outgoing scene goes at the midpoint (2.75), when the canvas covers it.
    expect(at("a.scene", "opacity")).toEqual([[2.5, 0.25, [null, 0]]]);
    expect(TRANSITION_DEFS.pixels.layers?.fx?.({ type: "pixels", duration: 0.5 }, { out: "a", into: "b", html: () => undefined }).style).toContain("var(--color-canvas)");
  });

  it("pixels lights square cells in a dither that sweeps the way it travels", () => {
    const tw = run({ type: "pixels", dir: "left" }).in.find((x) => x.target === "b.reveal")!;
    const spec = tw.fx as Extract<FxSpec, { kind: "pixels" }>;
    expect(spec).toEqual({ kind: "pixels", angle: 270, cols: 24, rows: 13.5 });
    const lit = (p: number) => {
      const m = decodeURIComponent(fxStyle(spec, p).maskImage!);
      return [...m.matchAll(/M(\d+) (\d+)h1/g)].map(([, c, r]) => [Number(c), Number(r)]);
    };
    expect(lit(0)).toEqual([]);
    expect(fxStyle(spec, 1).maskImage).toBe("none");
    const half = lit(0.5);
    const share = half.length / (24 * 14);
    expect(share).toBeGreaterThan(0.35);
    expect(share).toBeLessThan(0.65);
    // Travelling left: the right edge lights first.
    const right = half.filter(([c]) => c >= 18).length;
    const left = half.filter(([c]) => c < 6).length;
    expect(right).toBeGreaterThan(left * 3);
    // Every cell lit at 0.5 stays lit at 0.6: the reveal only grows.
    const later = new Set(lit(0.6).map((x) => x.join()));
    expect(half.every((x) => later.has(x.join()))).toBe(true);
  });

  it("morph hands each pair to a carrier: A leaves at the cut, B arrives when the carrier lands, the rest crossfades", () => {
    const t = run({ type: "morph", pairs: ["logo", ["title", "card"]], squash: 0.2 });
    expect(t.out.map((tw) => [tw.target, tw.start, tw.duration, tw.props])).toEqual([
      ["a.logo", 2.4, 0, { opacity: [null, 0] }],
      ["a.title", 2.4, 0, { opacity: [null, 0] }],
    ]);
    const into = Object.fromEntries(t.in.map((tw) => [tw.target, tw]));
    expect(into["b.reveal"].props).toEqual({ opacity: [0, 1] });
    expect(into["b.logo"]).toMatchObject({ start: 0, duration: 0.6, props: { opacity: [0, 1] }, ease: { type: "steps", n: 1 } });
    expect(into["b.card"]).toMatchObject({ props: { opacity: [0, 1] } });
    expect(into["b.match-0"]).toMatchObject({ props: { match: [0, 1] }, squash: 0.2, easeName: "inOut" });
    expect(into["b.match-1"]).toMatchObject({ props: { match: [0, 1] } });
  });

  it("a morph without pairs is refused by the storyboard", () => {
    const board = (transition: Record<string, unknown>) => ({
      title: "t",
      format: { aspect: "16:9" },
      scenes: [
        { id: "a", duration: 2, intent: "the outgoing scene", transition },
        { id: "b", duration: 2, intent: "the incoming scene" },
      ],
    });
    const r = parseStoryboard(board({ type: "morph" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join()).toMatch(/pairs/);
    expect(parseStoryboard(board({ type: "morph", pairs: ["logo"] })).ok).toBe(true);
  });

  it("depth flies through the stack on the steep ease, and dir out reverses it", () => {
    const fly = run({ type: "depth" });
    expect(fly.out[0]).toMatchObject({ easeName: "steep", props: { scale: [1, 1.8] } });
    expect(fly.in[0]).toMatchObject({ easeName: "steep", props: { scale: [0.6, 1] } });
    expect(fly.in[1].props).toEqual({ opacity: [0, 1] });
    const back = run({ type: "depth", dir: "out" });
    expect(back.out[0].props).toEqual({ scale: [1, 0.6] });
    expect(back.in[0].props).toEqual({ scale: [1.8, 1] });
  });

  it("crossfade and dip use litt's eases (inOut, out)", () => {
    expect(run({ type: "crossfade" }).in[0]).toMatchObject({ easeName: "inOut", props: { opacity: [0, 1] }, duration: 0.4 });
    const dip = run({ type: "dip" });
    expect(dip.out[0]).toMatchObject({ easeName: "out", props: { opacity: [null, 0] } });
    expect(dip.in[0]).toMatchObject({ easeName: "out", start: 0.25 });
  });

  it("push travels in its direction", () => {
    expect(run({ type: "push", dir: "right" }).out[0].props).toEqual({ xPct: [0, 100] });
    expect(run({ type: "push", dir: "right" }).in[0].props).toEqual({ xPct: [-100, 0] });
    expect(run({ type: "push", dir: "down" }).in[0].props).toEqual({ yPct: [-100, 0] });
  });

  it("a fast push carries a motion-blur bell peaking at mid-transition on both scenes", () => {
    const t = run({ type: "push", blur: true, duration: 0.4 });
    const bell = t.in.filter((tw) => tw.props.blurX);
    expect(bell).toHaveLength(2);
    expect(bell[0].start + bell[0].duration).toBeCloseTo(0.2, 3);
    expect(bell[0].props.blurX![1]).toBeLessThanOrEqual(0.06 * 1920 + 0.05);
    expect(t.out.filter((tw) => tw.props.blurX)).toHaveLength(2);
    expect(run({ type: "push", dir: "up", blur: true }).in.some((tw) => tw.props.blurY)).toBe(true);
  });

  it("a feathered wipe carries its fx spec", () => {
    expect(run({ type: "wipe", angle: 120, feather: 14 }).in[0].fx).toEqual({ kind: "wipe", angle: 120, feather: 14 });
    expect(run({ type: "wipe", dir: "up", feather: 10 }).in[0].fx).toEqual({ kind: "wipe", angle: 0, feather: 10 });
  });

  it("an ease override replaces the transition's curves", () => {
    expect(run({ type: "push", ease: "out" }).in[0].ease).toEqual(eases.out);
    expect(run({ type: "wipe", ease: [0.1, 0.2, 0.3, 1] }).in[0].ease).toEqual({ type: "bezier", p: [0.1, 0.2, 0.3, 1] });
  });
});

describe("fx presentations", () => {
  it("a wipe goes from fully masked to none", () => {
    expect(fxStyle({ kind: "wipe", angle: 90, feather: 10 }, 0)).toEqual({ maskImage: "linear-gradient(90deg, #000 -10%, transparent 0%)" });
    expect(fxStyle({ kind: "wipe", angle: 90, feather: 10 }, 0.5)).toEqual({ maskImage: "linear-gradient(90deg, #000 45%, transparent 55%)" });
    expect(fxStyle({ kind: "wipe", angle: 90, feather: 10 }, 1)).toEqual({ maskImage: "none" });
  });

});

describe("motion blur", () => {
  it("σ ≈ 0.144 × peak px/frame, capped at 6% of the travel", () => {
    expect(peakSlope(eases.linear as never)).toBeCloseTo(1, 3);
    expect(sigmaFor(eases.linear as never, 1920, 1, 30)).toBeCloseTo(0.144 * 64, 1);
    expect(sigmaFor(eases.inOut as never, 1920, 0.33, 30)).toBeCloseTo(79.8, 1);
  });
});

describe("storyboard transitions", () => {
  const sb = (transition: Record<string, unknown>, d = 3) => ({
    title: "t",
    format: { aspect: "16:9" },
    scenes: [
      { id: "a", duration: d, intent: "one", transition },
      { id: "b", duration: d, intent: "two" },
    ],
  });
  it("defaults the duration per type", () => {
    const fade = parseStoryboard(sb({ type: "crossfade" }));
    expect(fade.ok && fade.value.scenes[0].transition!.duration).toBe(0.4);
    const push = parseStoryboard(sb({ type: "push" }));
    expect(push.ok && push.value.scenes[0].transition!.duration).toBe(0.5);
  });
  it("rejects parameters a type doesn't take, and directions it doesn't run", () => {
    const r = parseStoryboard(sb({ type: "crossfade", dir: "left" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.issues.join()).toMatch(/crossfade has no "dir" parameter/);
    expect(parseStoryboard(sb({ type: "whip" })).ok).toBe(false);
  });
  it("rejects incoming and outgoing transitions that overlap inside a scene", () => {
    const r = parseStoryboard({
      title: "t",
      format: { aspect: "16:9" },
      scenes: [
        { id: "a", duration: 2, intent: "one", transition: { type: "push", duration: 0.6 } },
        { id: "b", duration: 1, intent: "two", transition: { type: "push", duration: 0.6 } },
        { id: "c", duration: 2, intent: "three" },
      ],
    });
    expect(!r.ok && r.issues.join()).toMatch(/overlap inside its 1s/);
  });
});

describe("registers and transitions (docs/decisions/0007)", () => {
  const sb = (register: string | undefined, types: Array<Record<string, unknown>>, sceneRegister?: string): Storyboard => {
    const r = parseStoryboard({
      title: "t",
      format: { aspect: "16:9" },
      ...(register ? { register } : {}),
      scenes: [
        ...types.map((transition, i) => ({ id: `s${i}`, duration: 3, intent: "one", transition, ...(i === 0 && sceneRegister ? { register: sceneRegister } : {}) })),
        { id: "end", duration: 3, intent: "end" },
      ],
    });
    if (!r.ok) throw new Error(r.issues.join("; "));
    return r.value;
  };
  const rules = (b: Storyboard) => lintStoryboard(b).map((f) => f.rule);

  it("depth is energetic: it warns in a calm edit, and not in an energetic one or next to an energetic scene", () => {
    expect(rules(sb(undefined, [{ type: "depth" }]))).toContain("transition-register");
    expect(rules(sb("energetic", [{ type: "depth" }]))).not.toContain("transition-register");
    expect(rules(sb("calm", [{ type: "depth" }], "energetic"))).not.toContain("transition-register");
  });

  it("depth runs in or out, never sideways; push never runs in depth", () => {
    expect(() => sb("energetic", [{ type: "depth", dir: "out" }])).not.toThrow();
    expect(() => sb("energetic", [{ type: "depth", dir: "left" }])).toThrow(/depth runs in or out/);
    expect(() => sb("energetic", [{ type: "push", dir: "in" }])).toThrow(/push runs left or right or up or down/);
  });

  it("the energetic register allows three accent types, calm two", () => {
    const three = [{ type: "dip" }, { type: "push", blur: true }, { type: "wipe" }];
    expect(rules(sb(undefined, three))).toContain("transition-language");
    expect(rules(sb("energetic", three))).not.toContain("transition-language");
    expect(rules(sb("energetic", [...three, { type: "crossfade" }]))).toContain("transition-language");
  });
});

describe("carry: a cut on movement", () => {
  const frame = { width: 1920, height: 1080, fps: 30 };
  const speed = (tw: ReturnType<typeof run>["out"][number], at: "start" | "end") => {
    const [a, b] = tw.props.xPct as [number, number];
    const p = (tw.ease as { p: [number, number, number, number] }).p;
    // A cubic bezier with linear x has slope 3·(y1) at 0 and 3·(1 − y2) at 1.
    const slope = at === "start" ? 3 * p[1] : 3 * (1 - p[3]);
    return ((b - a) * slope) / tw.duration;
  };
  it("is a cut: the outgoing scene accelerates into it, the incoming one leaves it at the same speed", () => {
    const t = transitionTweens({ type: "carry", duration: 0.5, dir: "left", distance: 10 }, { id: "a", duration: 3 }, { id: "b" }, frame);
    const out = t.out.find((tw) => tw.props.xPct)!;
    const into = t.in.find((tw) => tw.props.xPct)!;
    expect(out.start + out.duration).toBeCloseTo(3, 6);
    expect(into.start).toBe(0);
    expect(speed(out, "start")).toBeCloseTo(0, 6);
    expect(speed(into, "end")).toBeCloseTo(0, 6);
    expect(speed(out, "end")).toBeCloseTo(speed(into, "start"), 2);
    expect(speed(out, "end")).toBeLessThan(0);
    // The whole move covers the distance: what the outgoing scene travels plus what the incoming one still has to.
    expect((out.props.xPct as number[])[1] - (into.props.xPct as number[])[0]).toBeCloseTo(-10, 6);
  });
  it("blurs only when it moves fast enough to strobe, unless asked", () => {
    const blurOf = (s: Partial<TransitionSpec>) =>
      transitionTweens({ type: "carry", duration: 0.5, ...s } as TransitionSpec, { id: "a", duration: 3 }, { id: "b" }, frame).out.some((tw) => tw.props.blurX);
    expect(blurOf({})).toBe(false);
    expect(blurOf({ distance: 50 })).toBe(true);
    expect(blurOf({ blur: true })).toBe(true);
    expect(blurOf({ distance: 50, blur: false })).toBe(false);
  });
  it("calm keeps it a drift: a whip-pan distance needs the energetic register", () => {
    const sb = (register: "calm" | "energetic") => {
      const r = parseStoryboard({
        title: "t",
        format: { aspect: "16:9", fps: 30 },
        register,
        scenes: [
          { id: "a", duration: 2, intent: "one", transition: { type: "carry", distance: 40 } },
          { id: "b", duration: 2, intent: "two" },
        ],
      });
      if (!r.ok) throw new Error(r.issues.join());
      return r.value as Storyboard;
    };
    expect(lintStoryboard(sb("calm")).map((f) => f.rule)).toContain("transition-register");
    expect(lintStoryboard(sb("energetic")).map((f) => f.rule)).not.toContain("transition-register");
  });
});

describe("portal: the camera goes through an element", () => {
  it("in: the outgoing scene is the rig, the incoming scene the window, both measured on via in the outgoing scene", () => {
    const t = run({ type: "portal", via: "card" });
    const outer = t.out.find((tw) => tw.measure)!;
    const inner = t.in.find((tw) => tw.measure)!;
    expect(outer.measure).toEqual({ kind: "portal", via: "a.card", at: 3 - 0.8, role: "outer", dir: "in" });
    expect(inner.measure).toEqual({ kind: "portal", via: "a.card", at: 3 - 0.8, role: "inner", dir: "in" });
    expect(Object.keys(inner.props)).toEqual(expect.arrayContaining(["scale", "x", "y", "clipTop", "clipRound"]));
    expect(t.in.some((tw) => tw.props.opacity && (tw.props.opacity as number[])[0] === 0)).toBe(true);
    expect(TRANSITION_DEFS.portal.layers!.under!({ type: "portal", duration: 0.8 })).toBe(false);
  });
  it("out: the outgoing scene shrinks into via in the incoming one, on top of it", () => {
    const t = run({ type: "portal", via: "screen", dir: "out" });
    expect(t.out.find((tw) => tw.measure)!.measure).toEqual({ kind: "portal", via: "b.screen", at: 0.8, role: "inner", dir: "out" });
    expect(t.in.find((tw) => tw.measure)!.measure).toMatchObject({ role: "outer", dir: "out" });
    expect(TRANSITION_DEFS.portal.layers!.under!({ type: "portal", duration: 0.8, dir: "out" })).toBe(true);
  });
  it("needs via", () => {
    const r = parseStoryboard({
      title: "t",
      format: { aspect: "16:9", fps: 30 },
      scenes: [
        { id: "a", duration: 2, intent: "one", transition: { type: "portal" } },
        { id: "b", duration: 2, intent: "two" },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join()).toMatch(/via/);
  });
});

describe("layered handoffs: copy leads, UI follows, decor trails", () => {
  const frame = { width: 1920, height: 1080, fps: 30 };
  const els = [
    { id: "title", role: "headline" as const, anchor: "A3" },
    { id: "bars", role: "ui" as const, anchor: "D2:F5" },
  ];
  const layered = (spec: Partial<TransitionSpec> & { type: TransitionSpec["type"] }, elements = { out: els, in: els }) =>
    transitionTweens({ duration: TRANSITION_DEFS[spec.type].duration, ...spec } as TransitionSpec, { id: "a", duration: 3 }, { id: "b" }, frame, elements);
  const on = (tws: ReturnType<typeof layered>["out"], target: string) => tws.filter((tw) => tw.target === target);

  it("layerPlan orders along the travel and depths by role", () => {
    const p = layerPlan([{ id: "chart", role: "ui", anchor: "D2:F5" }, { id: "title", role: "headline", anchor: "A3" }, { id: "dot", role: "decor" }], "left", 0.5);
    expect(p.map((s) => s.id)).toEqual(["title", "chart", "dot"]);
    expect(p.map((s) => s.depth)).toEqual([1, 0.6, 0.35]);
    expect(p[2].delay).toBeLessThanOrEqual(0.15 + 1e-9);
    // Reversed travel reverses the wave; vertical travel orders by row.
    expect(layerPlan([{ id: "chart", role: "ui", anchor: "D2:F5" }, { id: "title", role: "headline", anchor: "A3" }], "right", 0.5).map((s) => s.id)).toEqual(["chart", "title"]);
    expect(layerPlan([{ id: "low", role: "body", anchor: "A5" }, { id: "high", role: "label", anchor: "C1" }], "up", 0.5).map((s) => s.id)).toEqual(["high", "low"]);
    expect(layerPlan([{ id: "low", role: "body", anchor: "A5" }, { id: "high", role: "label", anchor: "C1" }], "down", 0.5).map((s) => s.id)).toEqual(["low", "high"]);
  });

  it("layerPlan steps by the list stagger, capped at 0.3·d for the last", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: "e" + i, role: "body" as const, anchor: `${"ABCDEF"[i % 6]}1` }));
    const p = layerPlan(many, "left", 0.5);
    expect(p[1].delay - p[0].delay).toBeLessThanOrEqual(0.04 + 1e-9);
    expect(p.at(-1)!.delay).toBeLessThanOrEqual(0.15 + 1e-9);
    expect(layerPlan(many.slice(0, 3), "left", 2).map((s) => s.delay)).toEqual([0, 0.04, 0.08]);
  });

  it("depth by role: copy 1, UI 0.6, decor and media 0.35", () => {
    expect(LAYER_DEPTH).toMatchObject({ headline: 1, title: 1, body: 1, label: 1, caption: 1, stat: 1, cta: 1, logo: 1, ui: 0.6, decor: 0.35, media: 0.35 });
    expect(LAYER_TRAVEL).toBe(0.08);
  });

  it("a layered carry shifts each element on top of the plane", () => {
    const t = layered({ type: "carry", dir: "left", distance: 12, layers: true });
    const plain = layered({ type: "carry", dir: "left", distance: 12 });
    // The planes are untouched.
    expect(on(t.out, "a.scene")).toEqual(plain.out);
    expect(on(t.in, "b.scene")).toEqual(plain.in);
    const plane = plain.out[0];
    const tail = plain.in[0].duration;
    // Outgoing: from the plane's start + delay, ending with it, on the plane's ease, along the travel.
    const [ot] = on(t.out, "a.title");
    expect(ot.props).toEqual({ shiftX: [0, -LAYER_TRAVEL * 1920] });
    expect(ot.start).toBeCloseTo(plane.start, 6);
    expect(ot.start + ot.duration).toBeCloseTo(3, 6);
    expect(ot.ease).toEqual(plane.ease);
    const [ob] = on(t.out, "a.bars");
    expect(ob.props.shiftX![1]).toBeCloseTo(-LAYER_TRAVEL * 1920 * 0.6, 6);
    expect(ob.start).toBeCloseTo(plane.start + 0.04, 6);
    expect(ob.start + ob.duration).toBeCloseTo(3, 6);
    // Incoming: from behind, starting at its delay, for the plane's in-duration, easing out.
    const [it_] = on(t.in, "b.title");
    expect(it_.props).toEqual({ shiftX: [LAYER_TRAVEL * 1920, 0] });
    expect(it_.start).toBe(0);
    expect(it_.duration).toBeCloseTo(tail, 6);
    expect(it_.easeName).toBe("out");
    const [ib] = on(t.in, "b.bars");
    expect(ib.props.shiftX![0]).toBeCloseTo(LAYER_TRAVEL * 1920 * 0.6, 6);
    expect(ib.start).toBeCloseTo(0.04, 6);
    expect(ib.duration).toBeCloseTo(tail, 6);
    for (const tw of [...t.out, ...t.in]) expect(tw.kind).toBe("transition");
  });

  it("a layered push uses the push's ease; pushUp shifts along y by the frame's height", () => {
    const p = layered({ type: "push", layers: true });
    const [ot] = on(p.out, "a.title");
    expect(ot.ease).toEqual(on(p.out, "a.scene")[0].ease);
    expect(ot.start).toBeCloseTo(3 - 0.5, 6);
    const up = layered({ type: "pushUp", layers: true }, { out: [{ id: "title", role: "headline", anchor: "A3" }], in: [{ id: "title", role: "headline", anchor: "A3" }] });
    expect(on(up.out, "a.title")[0].props).toEqual({ shiftY: [0, -LAYER_TRAVEL * 1080] });
    expect(on(up.in, "b.title")[0].props).toEqual({ shiftY: [LAYER_TRAVEL * 1080, 0] });
  });

  it("without layers, push and carry are unchanged", () => {
    for (const spec of [{ type: "push" as const }, { type: "pushUp" as const }, { type: "carry" as const, distance: 12 }, { type: "push" as const, dir: "right" as const, blur: true }]) {
      const before = transitionTweens({ duration: 0.5, ...spec } as TransitionSpec, { id: "a", duration: 3 }, { id: "b" }, frame);
      expect(layered(spec)).toEqual(before);
      expect(layered({ ...spec, layers: false })).toEqual(before);
      // Layers asked for with nothing to layer (a placeholder neighbour): the plain move.
      expect(layered({ ...spec, layers: true }, { out: [], in: [] })).toEqual(before);
      expect(transitionTweens({ duration: 0.5, ...spec, layers: true } as TransitionSpec, { id: "a", duration: 3 }, { id: "b" }, frame)).toEqual(before);
    }
  });

  it("layers is a param of push, pushUp and carry only", () => {
    expect(TRANSITIONS.filter((t) => TRANSITION_DEFS[t].params.includes("layers"))).toEqual(["carry", "push", "pushUp"]);
    const r = parseStoryboard({
      title: "t",
      format: { aspect: "16:9", fps: 30 },
      scenes: [
        { id: "a", duration: 2, intent: "one", transition: { type: "crossfade", layers: true } },
        { id: "b", duration: 2, intent: "two" },
      ],
    });
    expect(r.ok).toBe(false);
  });
});
