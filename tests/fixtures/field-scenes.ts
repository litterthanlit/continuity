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
  /** Storyboard elements (roles, anchors). */
  elements?: Array<{ id: string; role?: string; anchor?: string }>;
  /** Storyboard transition into the next scene. */
  transition?: Record<string, unknown>;
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
    scenes: scenes.map((s) => ({
      id: s.id,
      duration: s.duration,
      intent: "A fixture scene.",
      text: s.text ?? {},
      ...(s.elements ? { elements: s.elements } : {}),
      ...(s.transition ? { transition: s.transition } : {}),
    })),
  };
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify(storyboard));
  for (const s of scenes) {
    writeFileSync(
      join(dir, "scenes", s.id + ".tsx"),
      '/** @jsxImportSource preact */\nimport { scene, Stage, Safe, Headline, Stack, Label } from "continuity";\n' +
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

/**
 * Two scenes joined by a layered carry (left). Each has a headline `h` (A3) and a `panel` (ui,
 * D2:F5) with a `stat` inside it — a storyboard element whose parent is one too, so it rides its
 * parent instead of taking the handoff itself. The incoming headline rises in at 0.
 */
export function layeredFilm(): string {
  const view =
    '<Stage bg="solid"><Safe><Headline ct="h">{text.h}</Headline>' +
    '<Stack ct="panel" class="absolute right-0 top-[200px]"><Label ct="stat">{text.stat}</Label></Stack></Safe></Stage>';
  const elements = [
    { id: "h", role: "headline", anchor: "A3" },
    { id: "panel", role: "ui", anchor: "D2:F5" },
    { id: "stat", role: "stat", anchor: "E3" },
  ];
  const text = { h: "Layered", stat: "42" };
  return fixtureProject([
    { id: "a", duration: 2, text, view, elements, transition: { type: "carry", dir: "left", distance: 12, layers: true } },
    { id: "b", duration: 2, text, view, elements, motion: 'm.enter("h", "rise", { at: 0 });' },
  ]);
}

export function removeFixtureProjects(): void {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}
