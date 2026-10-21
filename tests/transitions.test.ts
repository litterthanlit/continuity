import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fxStyle } from "../src/motion/fx.js";
import { peakSlope, sigmaFor } from "../src/motion/easing.js";
import { eases } from "../src/motion/tokens.js";
import { TRANSITION_DEFS, TRANSITIONS, transitionTweens, type TransitionSpec } from "../src/motion/transitions.js";
import { parseStoryboard } from "../src/spec/storyboard.js";

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
  it("is cuts plus four accents; nothing that performs", () => {
    expect([...TRANSITIONS]).toEqual(["cut", "crossfade", "dip", "push", "pushUp", "wipe"]);
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
