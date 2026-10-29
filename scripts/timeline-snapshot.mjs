#!/usr/bin/env node
// Dump the compiled timeline, element registry and lint findings of projects as one JSON
// document, so an engine change can be proven not to move a single tween in existing work:
//
//   node scripts/timeline-snapshot.mjs example-launch example-type > before.json
//   … change the engine …
//   node scripts/timeline-snapshot.mjs example-launch example-type | diff before.json -
//
// Boots like bin/ct.mjs: scene files import `continuity`, which only the launcher's hook resolves.
import { register as registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "tsx/esm/api";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
registerHooks("../bin/loader-hooks.mjs", import.meta.url, {
  data: { entryURL: pathToFileURL(join(ROOT, "src", "index.ts")).href, pkgJsonURL: pathToFileURL(join(ROOT, "package.json")).href },
});
register({ tsconfig: join(ROOT, "build", ".ct", "tsconfig.json") });

const { buildProject } = await import(pathToFileURL(join(ROOT, "src/build/build.ts")).href);
const { lintTimeline } = await import(pathToFileURL(join(ROOT, "src/lint/timeline.ts")).href);
const out = {};
for (const slug of process.argv.slice(2)) {
  const b = await buildProject(slug, { write: false });
  out[slug] = { ok: b.ok, findings: b.findings, timeline: b.timeline, elements: b.elements, lint: lintTimeline(b) };
}
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
