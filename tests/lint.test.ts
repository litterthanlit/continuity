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
      "lint:ease-register",
    ]) {
      expect(ids, r).toContain(r);
    }
  });
});

describe("good projects stay clean (no false positives)", () => {
  for (const slug of ["example-type", "_kit", "_smoke", "_template", "_type", "_transitions", "_energetic", "_launch"]) {
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

  it("builds one scene of a film with a morph alone (its neighbours are placeholders)", async () => {
    for (const only of ["cards", "stat", "type"]) {
      const b = await buildProject("example-beat", { write: false, only });
      expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
      expect(b.ok).toBe(true);
    }
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

describe("launch devices (projects/_launch)", () => {
  /** The gallery with every tween on `target` from the `nth` one on moved earlier by `by` seconds. */
  async function rushed(target: string, nth: number, by: number) {
    const { b } = await rules("_launch");
    const scenes = b.timeline!.scenes.map((sc) => {
      let seen = 0;
      return { ...sc, tweens: sc.tweens.map((t) => (t.target === target && seen++ >= nth ? { ...t, start: Math.max(0, t.start - by) } : t)) };
    });
    return lintTimeline({ ...b, timeline: { ...b.timeline!, scenes } });
  }

  it("retype-hold fires when a claim is deleted before it can be read", async () => {
    const found = (await rushed("value.end", 1, 0.9)).filter((f) => f.rule === "retype-hold");
    expect(found.map((f) => f.message)).toEqual([expect.stringContaining('"ranking #1"')]);
  });

  it("cycle-glance fires when a word flips away almost as soon as it lands", async () => {
    const found = (await rushed("intro.tool-1", 1, 0.4)).filter((f) => f.rule === "cycle-glance");
    expect(found.map((f) => f.element)).toEqual(["intro.tool-1"]);
  });

  it("the stack's arrivals travel one row without tripping travel-too-far, even judged calm", async () => {
    const { b } = await rules("_launch");
    const calm = lintTimeline({ ...b, storyboard: { ...b.storyboard!, register: "calm" } });
    expect(calm.filter((f) => f.rule === "travel-too-far" && f.element?.startsWith("alerts.alerts-"))).toEqual([]);
  });
});
