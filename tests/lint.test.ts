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
      "lint:hairline-weight",
      "lint:transition-too-long",
      "lint:transition-too-short",
      "lint:transition-language",
      "lint:transition-bounce",
      "lint:transition-strobe",
    ]) {
      expect(ids, r).toContain(r);
    }
  });
});

describe("good projects stay clean (no false positives)", () => {
  for (const slug of ["example-type", "_kit", "_smoke", "_template"]) {
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
