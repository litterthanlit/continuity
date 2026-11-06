import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PKG_ROOT } from "../../src/paths.js";

/**
 * A throwaway project of `n` one-second scenes, each on its own gradient field (one WebGL context
 * each), under build/ (gitignored) so `preact` resolves from the repo's node_modules.
 */
export function fieldScenes(n: number): string {
  mkdirSync(join(PKG_ROOT, "build"), { recursive: true });
  const dir = mkdtempSync(join(PKG_ROOT, "build", "ct-fields-"));
  mkdirSync(join(dir, "scenes"));
  const ids = Array.from({ length: n }, (_, i) => "s" + i);
  const storyboard = {
    title: "Fields",
    format: { aspect: "16:9", fps: 30 },
    theme: "litt-dark",
    type: "litt",
    scenes: ids.map((id) => ({ id, duration: 1, intent: "A field.", text: {} })),
  };
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify(storyboard));
  for (const id of ids) {
    writeFileSync(join(dir, "scenes", id + ".tsx"), '/** @jsxImportSource preact */\nimport { scene, Stage } from "continuity";\nexport default scene({ view: () => <Stage bg="gradient" gradient="aurora" />, motion: () => {} });\n');
  }
  return dir;
}
