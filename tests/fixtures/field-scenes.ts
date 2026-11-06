import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PKG_ROOT } from "../../src/paths.js";

interface FixtureScene {
  id: string;
  duration: number;
  /** The scene's `<Stage>` (JSX, may read `text.h`). */
  view: string;
  /** The body of `motion: (m) => { … }`. */
  motion?: string;
  text?: Record<string, string>;
}

const made: string[] = [];

/**
 * A throwaway project under build/ (gitignored) so `preact` resolves from the repo's node_modules.
 * Every one made is removed by `removeFixtureProjects()` (call it from `afterAll`).
 */
function fixtureProject(scenes: FixtureScene[]): string {
  mkdirSync(join(PKG_ROOT, "build"), { recursive: true });
  const dir = mkdtempSync(join(PKG_ROOT, "build", "ct-fields-"));
  made.push(dir);
  mkdirSync(join(dir, "scenes"));
  const storyboard = {
    title: "Fields",
    format: { aspect: "16:9", fps: 30 },
    theme: "litt-dark",
    type: "litt",
    scenes: scenes.map((s) => ({ id: s.id, duration: s.duration, intent: "A fixture scene.", text: s.text ?? {} })),
  };
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify(storyboard));
  for (const s of scenes) {
    writeFileSync(
      join(dir, "scenes", s.id + ".tsx"),
      '/** @jsxImportSource preact */\nimport { scene, Stage, Safe, Headline } from "continuity";\n' +
        `export default scene({ view: ({ text }) => (${s.view}), motion: (m) => { ${s.motion ?? ""} } });\n`,
    );
  }
  return dir;
}

/** `n` one-second scenes, each on its own gradient field (one WebGL context each). */
export function fieldScenes(n: number): string {
  return fixtureProject(Array.from({ length: n }, (_, i) => ({ id: "s" + i, duration: 1, view: '<Stage bg="gradient" gradient="aurora" />' })));
}

/**
 * A long film: `n` one-second solid scenes, each with a headline rising in (three audit times each,
 * so the film overflows the audit's 40-sample cap), and in the middle one four-second scene with a
 * grey headline over the `accent` field: under 3:1 wherever the field's cobalt passes behind it.
 */
export function greyOnFieldFilm(n: number): string {
  const solid = (i: number): FixtureScene => ({
    id: "s" + i,
    duration: 1,
    text: { h: "Solid " + i },
    view: '<Stage bg="solid"><Safe><Headline ct="h">{text.h}</Headline></Safe></Stage>',
    motion: 'm.enter("h", "rise", { at: 0.1 });',
  });
  const field: FixtureScene = {
    id: "field",
    duration: 4,
    text: { grey: "Grey on the field" },
    view: '<Stage bg="gradient" gradient="accent"><Safe><Headline ct="grey" class="absolute left-0 top-[360px] text-fg-muted">{text.grey}</Headline></Safe></Stage>',
  };
  const half = Math.floor(n / 2);
  return fixtureProject([...Array.from({ length: half }, (_, i) => solid(i)), field, ...Array.from({ length: n - half }, (_, i) => solid(half + i))]);
}

export function removeFixtureProjects(): void {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}
