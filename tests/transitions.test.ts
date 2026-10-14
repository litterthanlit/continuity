import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fxStyle } from "../src/motion/fx.js";
import { peakSlope, sigmaFor } from "../src/motion/easing.js";
import { eases } from "../src/motion/tokens.js";
import { TRANSITION_DEFS, TRANSITIONS, transitionTweens, type TransitionSpec } from "../src/motion/transitions.js";
import { parseStoryboard } from "../src/spec/storyboard.js";

const LEGACY = ["cut", "crossfade", "dip", "push", "pushUp", "blur", "zoom", "wipe"] as const;
const snapshot = JSON.parse(readFileSync(new URL("./golden/transitions-v1.json", import.meta.url), "utf8")) as Record<string, unknown>;
const run = (spec: Partial<TransitionSpec> & { type: TransitionSpec["type"] }, outDur = 3) =>
  transitionTweens({ duration: TRANSITION_DEFS[spec.type].duration, ...spec } as TransitionSpec, { id: "a", duration: outDur }, { id: "b" });

describe("legacy transitions are unchanged (characterization, v1 snapshot)", () => {
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

describe("new transitions", () => {
  it("push travels in its direction", () => {
    expect(run({ type: "push", dir: "right" }).out[0].props).toEqual({ xPct: [0, 100] });
    expect(run({ type: "push", dir: "right" }).in[0].props).toEqual({ xPct: [-100, 0] });
    expect(run({ type: "push", dir: "down" }).in[0].props).toEqual({ yPct: [-100, 0] });
  });

  it("whip carries a motion-blur bell peaking at mid-transition on both scenes", () => {
    const t = run({ type: "whip" });
    const bell = t.in.filter((tw) => tw.props.blurX);
    expect(bell).toHaveLength(2);
    const sigma = bell[0].props.blurX![1];
    expect(sigma).toBeGreaterThan(30);
    expect(sigma).toBeLessThanOrEqual(0.06 * 1920 + 0.05);
    expect(bell[0].start + bell[0].duration).toBeCloseTo(0.165, 3);
    expect(t.out.filter((tw) => tw.props.blurX)).toHaveLength(2);
    expect(run({ type: "whip", blur: false }).in.some((tw) => tw.props.blurX)).toBe(false);
    expect(run({ type: "whip", dir: "up" }).in.some((tw) => tw.props.blurY)).toBe(true);
  });

  it("punchCut swaps at 45% in one frame and flashes", () => {
    const t = run({ type: "punchCut" });
    const step = t.in.find((tw) => tw.props.opacity && tw.target === "b.scene")!;
    expect(step.start).toBeCloseTo(0.37 * 0.45, 2);
    expect(step.ease).toEqual({ type: "steps", n: 1 });
    expect(t.in.filter((tw) => tw.target === "b.fx")).toHaveLength(2);
    expect(run({ type: "punchCut", flash: 0 }).in.filter((tw) => tw.target === "b.fx")).toHaveLength(0);
  });

  it("shape transitions carry their fx spec", () => {
    expect(run({ type: "iris", origin: { x: 70, y: 40 } }).in[0].fx).toEqual({ kind: "iris", x: 70, y: 40, feather: 1.5 });
    expect(run({ type: "wipe", angle: 120, feather: 14 }).in[0].fx).toEqual({ kind: "wipe", angle: 120, feather: 14 });
    expect(run({ type: "wipe", dir: "up", feather: 10 }).in[0].fx).toEqual({ kind: "wipe", angle: 0, feather: 10 });
    expect(run({ type: "strips" }).in[0].fx).toMatchObject({ kind: "strips", n: 6, dir: "up" });
    const sweep = run({ type: "lightSweep" });
    expect(sweep.in.map((tw) => tw.target)).toEqual(["b.reveal", "b.fx", "b.fx"]);
  });

  it("an ease override replaces the transition's curves", () => {
    expect(run({ type: "push", ease: "hero" }).in[0].ease).toEqual(eases.hero);
    expect(run({ type: "iris", ease: [0.1, 0.2, 0.3, 1] }).in[0].ease).toEqual({ type: "bezier", p: [0.1, 0.2, 0.3, 1] });
  });
});

describe("fx presentations", () => {
  it("wipe and iris go from fully masked to none", () => {
    expect(fxStyle({ kind: "wipe", angle: 90, feather: 10 }, 0)).toEqual({ maskImage: "linear-gradient(90deg, #000 -10%, transparent 0%)" });
    expect(fxStyle({ kind: "wipe", angle: 90, feather: 10 }, 0.5)).toEqual({ maskImage: "linear-gradient(90deg, #000 45%, transparent 55%)" });
    expect(fxStyle({ kind: "wipe", angle: 90, feather: 10 }, 1)).toEqual({ maskImage: "none" });
    expect(fxStyle({ kind: "iris", x: 50, y: 50, feather: 2 }, 0.5).maskImage).toBe("radial-gradient(circle farthest-corner at 50% 50%, #000 49%, transparent 51%)");
  });

  it("strips build one skyline polygon: degenerate at 0, none at 1", () => {
    const spec = { kind: "strips" as const, n: 4, dir: "up" as const, stagger: 0.1, ease: eases.linear };
    const at0 = fxStyle(spec, 0).clipPath!;
    expect(at0.match(/%/g)!.length / 2).toBe(2 * 4 + 2);
    // Nothing has risen at p = 0: every vertex sits on the bottom edge.
    expect(at0).toBe("polygon(0% 100%, 0% 100%, 25% 100%, 25% 100%, 50% 100%, 50% 100%, 75% 100%, 75% 100%, 100% 100%, 100% 100%)");
    expect(fxStyle(spec, 1)).toEqual({ clipPath: "none" });
    const mid = fxStyle(spec, 0.5).clipPath!;
    expect(mid.startsWith("polygon(0% 100%, 0% ")).toBe(true);
    expect(mid.endsWith("100% 100%)")).toBe(true);
  });
});

describe("motion blur", () => {
  it("σ ≈ 0.144 × peak px/frame, capped at 6% of the travel", () => {
    expect(peakSlope(eases.linear as never)).toBeCloseTo(1, 3);
    expect(sigmaFor(eases.linear as never, 1920, 1, 30)).toBeCloseTo(0.144 * 64, 1);
    expect(sigmaFor(eases.sharp as never, 1920, 0.33, 30)).toBeCloseTo(115.2, 1);
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
  it("defaults the duration per type; legacy defaults stay 0.5", () => {
    const whip = parseStoryboard(sb({ type: "whip" }));
    expect(whip.ok && whip.value.scenes[0].transition!.duration).toBe(0.33);
    const push = parseStoryboard(sb({ type: "push" }));
    expect(push.ok && push.value.scenes[0].transition!.duration).toBe(0.5);
  });
  it("rejects parameters a type doesn't take, and directions it doesn't run", () => {
    const r = parseStoryboard(sb({ type: "crossfade", dir: "left" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.issues.join()).toMatch(/crossfade has no "dir" parameter/);
    const s = parseStoryboard(sb({ type: "lightSweep", dir: "up" }));
    expect(!s.ok && s.issues.join()).toMatch(/lightSweep runs left or right/);
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
