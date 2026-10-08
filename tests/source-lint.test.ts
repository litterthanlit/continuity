import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lintSources } from "../src/lint/source.js";

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "ct-src-"));
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), body);
  }
  return dir;
}

describe("source lint (determinism outside this repo's ESLint)", () => {
  it("flags wall-clock, random and timer APIs with file:line and scene", () => {
    const dir = project({
      "scenes/hook.tsx": ["const a = Math.random();", "const b = Date.now();", "setTimeout(() => {}, 10);", "const d = new Date();"].join("\n"),
      "lib/x.ts": "requestAnimationFrame(() => {});\nconst p = performance.now();",
    });
    const f = lintSources(dir);
    expect(f.filter((x) => x.rule === "nondeterministic-api")).toHaveLength(6);
    expect(f.find((x) => x.message.startsWith("scenes/hook.tsx:2"))?.scene).toBe("hook");
    expect(f.every((x) => x.severity === "error")).toBe(true);
  });

  it("flags CSS animation/transition and Tailwind animate-*/transition classes", () => {
    const dir = project({
      "scenes/a.tsx": [
        `<div style={{ transition: "opacity 1s" }} />`,
        `<div class="flex animate-spin" />`,
        `<div className="transition-opacity" />`,
        "const css = `.x { animation: spin 1s }`;",
      ].join("\n"),
    });
    expect(lintSources(dir).filter((x) => x.rule === "css-animation")).toHaveLength(4);
  });

  it("ignores comments, URLs and look-alike identifiers", () => {
    const dir = project({
      "scenes/ok.tsx": [
        "// Math.random() would be wrong here",
        "/* setTimeout( */",
        `const url = "https://example.com/Date.now";`,
        `m.enter("x", "rise", { transition: undefined });`,
        `import { transitions } from "continuity";`,
        `<div class="translate-x-2 duration-label" />`,
      ].join("\n"),
    });
    expect(lintSources(dir)).toEqual([]);
  });
});
