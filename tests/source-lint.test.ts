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

describe("source lint: litt's rules a class list can break (docs/decisions/0006)", () => {
  it("flags weights, case, gradients, radii, shadows, accent text and hex outside litt", () => {
    const dir = project({
      "scenes/x.tsx": [
        `<p class="font-semibold">a</p>`,
        `<p class="md:font-bold">b</p>`,
        `<p class="uppercase tracking-wide">c</p>`,
        `<p class="bg-gradient-to-r from-accent to-fg">d</p>`,
        `<div class="rounded-lg" />`,
        `<div class="rounded-[12px]" />`,
        `<div class="shadow-lg" />`,
        `<div class="drop-shadow-md" />`,
        `<span class="text-accent">e</span>`,
        `<div class="bg-[#ff0000]" />`,
        `<div style={{ color: "#fff" }} />`,
        `<div style="background: linear-gradient(90deg, red, blue)" />`,
      ].join("\n"),
    });
    const by = (r: string) => lintSources(dir).filter((x) => x.rule === r).length;
    expect(by("litt-weight")).toBe(2);
    expect(by("litt-case")).toBe(1);
    expect(by("litt-gradient")).toBe(2);
    expect(by("litt-radius")).toBe(2);
    expect(by("litt-shadow")).toBe(2);
    expect(by("litt-accent-text")).toBe(1);
    expect(by("litt-hex")).toBe(2);
    expect(lintSources(dir).every((x) => x.severity === "warning")).toBe(true);
  });

  it("passes litt's own vocabulary, and a deliberate litt-allow with its reason", () => {
    const dir = project({
      "scenes/ok.tsx": [
        `<Headline class="font-display font-title text-fg text-display" />`,
        `<Label class="font-label text-fg-subtle" />`,
        `<div class="rounded-control rounded-surface rounded-full rounded-t-surface shadow-raised shadow-float shadow-glow bg-data-blue-tint text-accent-fg" />`,
        `// litt-allow: litt-radius (the device bezel is the phone's own shape)`,
        `<div class="rounded-[68px]" />`,
        `<div class="rounded-[54px]" /> {/* litt-allow: litt-radius */}`,
        `<p>Issue #142 is fixed</p>`,
      ].join("\n"),
    });
    expect(lintSources(dir)).toEqual([]);
  });
});
