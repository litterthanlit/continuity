import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findWorkRoot, readWorkConfig } from "../src/paths.js";

const tree = () => mkdtempSync(join(tmpdir(), "ct-root-"));

describe("work root (the user's repo)", () => {
  it("prefers continuity.json over package.json, from any subdirectory", () => {
    const root = tree();
    writeFileSync(join(root, "continuity.json"), "{}");
    mkdirSync(join(root, "app", "projects", "demo"), { recursive: true });
    writeFileSync(join(root, "app", "package.json"), "{}");
    expect(findWorkRoot(join(root, "app", "projects", "demo"), {})).toBe(root);
  });

  it("falls back to the nearest package.json", () => {
    const root = tree();
    writeFileSync(join(root, "package.json"), "{}");
    mkdirSync(join(root, "projects", "x"), { recursive: true });
    expect(findWorkRoot(join(root, "projects", "x"), {})).toBe(root);
  });

  it("honours CT_ROOT", () => {
    expect(findWorkRoot("/anywhere", { CT_ROOT: "/repo" })).toBe("/repo");
  });

  it("reads dirs from continuity.json with defaults for the rest", () => {
    const root = tree();
    writeFileSync(join(root, "continuity.json"), JSON.stringify({ projectsDir: "videos" }));
    expect(readWorkConfig(root)).toEqual({ projectsDir: "videos", buildDir: "build", outDir: "out" });
    expect(readWorkConfig(tree())).toEqual({ projectsDir: "projects", buildDir: "build", outDir: "out" });
  });
});
