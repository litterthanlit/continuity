import { describe, expect, it } from "vitest";
import { buildProject } from "../src/build/build.js";
import { join } from "node:path";
import { lintTimeline } from "../src/lint/timeline.js";
import { PKG_ROOT } from "../src/paths.js";

/** Projects that live outside projects/ (shipped with the package). */
const SRC: Record<string, string> = { _template: join(PKG_ROOT, "templates", "project") };

async function rules(slug: string) {
  const b = await buildProject(slug, { write: false, srcDir: SRC[slug] });
  const findings = [...b.findings, ...lintTimeline(b)];
  return { b, findings, ids: new Set(findings.map((f) => `${f.source}:${f.rule}`)) };
}

describe("seeded static defects (projects/_defects)", () => {
  it("every seeded lint/build rule fires", async () => {
    const { ids } = await rules("_defects");
    for (const r of [
      "build:glyph-missing",
      "build:target-missing",
      "build:text-missing",
      "lint:ease-linear",
      "lint:settle-interrupted",
      "lint:read-time",
      "lint:unstaggered-group",
      "lint:scene-overrun",
      "lint:late-entrance",
      "lint:slow-open",
      "lint:dead-air",
      "lint:axis-reflow",
      "lint:axis-unsupported",
      "lint:axis-range",
      "lint:weight-role",
      "lint:transition-too-long",
      "lint:transition-too-short",
      "lint:transition-language",
      "lint:transition-bounce",
      "lint:transition-strobe",
      // litt (docs/decisions/0006)
      "lint:spring-bounce",
      "lint:exit-bounce",
      "lint:expressive-budget",
      "lint:material-motion",
      "lint:property-motion",
      "lint:travel-too-far",
      "lint:camera-drift",
      "lint:ambient-loop",
      // registers (docs/decisions/0007)
      "lint:transition-register",
      "lint:text-fade",
    ]) {
      expect(ids, r).toContain(r);
    }
  });
});

describe("good projects stay clean (no false positives)", () => {
  for (const slug of ["example-type", "_kit", "_smoke", "_template", "_type", "_transitions", "_energetic", "_clip"]) {
    it(slug, async () => {
      const { findings } = await rules(slug);
      const errors = findings.filter((f) => f.severity === "error");
      expect(errors.map((e) => `${e.rule}: ${e.message}`)).toEqual([]);
    });
  }
});

describe("build output", () => {
  it("is deterministic for identical sources", async () => {
    const a = await buildProject("_smoke", { write: false });
    const b = await buildProject("_smoke", { write: false });
    expect(JSON.stringify(a.timeline)).toEqual(JSON.stringify(b.timeline));
    expect(a.hash).toEqual(b.hash);
  });

  it("marks split targets and records elements", async () => {
    const b = await buildProject("example-type", { write: false });
    const l1 = b.elements.find((e) => e.id === "hook.l1");
    expect(l1?.split).toBe("lines");
    expect(b.timeline!.scenes.map((s) => s.scene)).toEqual(["hook", "write", "blind", "eyes", "check", "end"]);
  });
});

describe("registers (docs/decisions/0007)", () => {
  it("the energetic gallery is clean of warnings; the same motion judged calm trips litt's bounds", async () => {
    const { b, findings } = await rules("_energetic");
    expect(findings.filter((f) => f.severity !== "info").map((f) => `${f.rule}: ${f.message}`)).toEqual([]);
    const calm = lintTimeline({ ...b, storyboard: { ...b.storyboard!, register: "calm" } });
    const ids = new Set(calm.map((f) => f.rule));
    for (const r of ["spring-bounce", "travel-too-far", "expressive-budget", "camera-drift", "transition-register"]) expect(ids, r).toContain(r);
  });

  it("a scene's own register wins over the storyboard's", async () => {
    const { b } = await rules("_energetic");
    const sb = b.storyboard!;
    const scenes = sb.scenes.map((s) => (s.id === "collage" ? { ...s, register: "calm" as const } : s));
    const found = lintTimeline({ ...b, storyboard: { ...sb, scenes } }).filter((f) => f.rule === "spring-bounce");
    expect(found.length).toBeGreaterThan(0);
    expect(new Set(found.map((f) => f.scene))).toEqual(new Set(["collage"]));
  });
});

describe("loop clips (docs/decisions/0008)", () => {
  it("the loop gallery is clean: frame one populated, a 30–50% hold that dead-air leaves alone", async () => {
    const { findings } = await rules("_clip");
    expect(findings.filter((f) => f.severity !== "info").map((f) => `${f.rule}: ${f.message}`)).toEqual([]);
  });

  it("an empty frame one, a short hold and a long clip are each flagged", async () => {
    const { b } = await rules("_clip");
    const tl = structuredClone(b.timeline!);
    const sc = tl.scenes[0];
    // Every element of the first scene enters → frame one is empty.
    const root = new Set([`${sc.scene}.camera`, `${sc.scene}.scene`]);
    for (const e of b.elements.filter((e) => e.scene === sc.scene && e.ancestors.every((a) => root.has(a)))) {
      sc.tweens.unshift({ target: e.id, kind: "enter", start: 0, duration: 0.2, ease: { type: "linear" }, props: { opacity: [0, 1] } });
    }
    // Cut the scene to just after its last move → the final state barely holds.
    sc.duration = tl.duration = 2.2;
    const ids = new Set(lintTimeline({ ...b, timeline: tl }).map((f) => `${f.rule}:${f.severity}`));
    expect(ids).toContain("loop-open:warning");
    expect(ids).toContain("loop-hold:warning");
    expect(ids).toContain("loop-length:info");
  });

  it("the loop rules only run on loop clips", async () => {
    const { b } = await rules("_clip");
    const found = lintTimeline({ ...b, storyboard: { ...b.storyboard!, loop: false } }).map((f) => f.rule);
    expect(found.some((r) => r.startsWith("loop-"))).toBe(false);
    expect(found).toContain("dead-air");
  });
});
