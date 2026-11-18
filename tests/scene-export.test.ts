import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildProject } from "../src/build/build.js";
import { PKG_ROOT } from "../src/paths.js";

// Under build/ (gitignored) so `preact` resolves from the repo's node_modules, like tests/fixtures/field-scenes.ts.
// One directory per case: Node caches a module by its path, so a rewritten scene file would not be re-read.
const made: string[] = [];
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

function project(sceneSource: string): string {
  mkdirSync(join(PKG_ROOT, "build"), { recursive: true });
  const dir = mkdtempSync(join(PKG_ROOT, "build", "ct-export-"));
  made.push(dir);
  mkdirSync(join(dir, "scenes"));
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify({ title: "Export", format: { aspect: "16:9", fps: 30 }, theme: "litt-dark", type: "litt", scenes: [{ id: "a", duration: 2, intent: "A fixture scene.", text: {} }] }));
  writeFileSync(join(dir, "scenes", "a.tsx"), sceneSource);
  return dir;
}
const errors = async (sceneSource: string) => (await buildProject("export", { write: false, srcDir: project(sceneSource) })).findings.filter((f) => f.severity === "error").map((f) => f.rule);

describe("a scene file that exports no scene", () => {
  it("is a build error when it has no default export", async () => {
    expect(await errors('/** @jsxImportSource preact */\nimport { scene, Stage } from "continuity";\nexport const a = scene({ view: () => <Stage /> });\n')).toEqual(["scene-export"]);
  });

  it("is a build error when the default export has no view", async () => {
    expect(await errors("export default { motion: () => {} };\n")).toEqual(["scene-export"]);
  });

  it("builds when the scene is the default export", async () => {
    expect(await errors('/** @jsxImportSource preact */\nimport { scene, Stage } from "continuity";\nexport default scene({ view: () => <Stage /> });\n')).toEqual([]);
  });
});
