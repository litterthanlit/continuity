# Plan 008: A scene file that exports no scene fails the build

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 09b0d13..HEAD -- src/build/build.ts tests/scene-export.test.ts`
> If any of these changed since this plan was written, the diff in Step 2 may
> not apply; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `09b0d13`, 2026-11-18

## Why this matters

Each scene lives in `scenes/<id>.tsx` and must `export default scene({ view, motion })`.
If the file loads but has no default export (for example `export const hook = scene(…)`),
the build reports nothing: it stays `ok: true` and the film renders the red
"missing scene" placeholder in that scene's place. The gate can then pass on a
film that is missing a scene. After this plan that file is a build error with
the existing rule `scene-export`.

## Current state

- `src/build/build.ts` — `buildProject`. For each storyboard scene it imports
  the scene file; `defaultExport()` returns `undefined` when there is no default
  export. The existing check only fires when a default export exists but has no
  `view`, so `undefined` slips through and the placeholder stays.
- A scene file that is missing altogether (`scene-missing`) or throws on import
  (`scene-import`) is already an error; this plan does not change those.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile` | exit 0 |
| The new tests | `npx vitest run tests/scene-export.test.ts` | all pass |
| Typecheck and lint | `pnpm typecheck && pnpm lint` | exit 0 |
| Everything | `pnpm verify` | exit 0; at `09b0d13` the suite is 304 passed, 26 skipped |

Conventions: TypeScript ES modules, 2-space indent, double quotes, semicolons;
relative imports end in `.js`. Comments are rare, full sentences, and say why.
The code and tests below were run against `09b0d13` before this plan was written:
the tests fail without the change and pass with it, and the whole suite
(including the browser suite) passes with it.

## Scope

**In scope**: `src/build/build.ts` (the scene import block only), `tests/scene-export.test.ts` (create), `plans/README.md` (status row).

**Out of scope**: the placeholder markup, `scene-missing` and `scene-import`, every other file.

## Git workflow

- Branch: `advisor/008-a-scene-file-must-export-a-scene` (or the branch your operator gave you).
- One commit. Message style is a plain sentence with an area prefix. Suggested: `Build: a scene file that exports no scene is an error`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing tests

Create `tests/scene-export.test.ts` with exactly this content:

```ts
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
```

**Verify**: `npx vitest run tests/scene-export.test.ts` → 1 failed, 2 passed. The failure is the "no default export" case, which receives `[]` where `["scene-export"]` is expected. The "no view" case already passes (the existing check catches it) and stays as a guard.

### Step 2: Make the change

Apply exactly this diff (by hand, or save it to a file and run `git apply <file>`). Do not change anything else in these files.

```diff
diff --git a/src/build/build.ts b/src/build/build.ts
index 24d89c6..0483e6a 100644
--- a/src/build/build.ts
+++ b/src/build/build.ts
@@ -278,8 +278,10 @@ export async function buildProject(
       findings.push({ source: "build", rule: "scene-missing", severity: "error", scene: sc.id, message: `scenes/${sc.id}.tsx not found in ${rel(src)}` });
     } else {
       let def: SceneDefinition | undefined;
+      let loaded = false;
       try {
         def = defaultExport<SceneDefinition>(await import(pathToFileURL(file).href));
+        loaded = true;
       } catch (e) {
         const msg = errMsg(e);
         const cjs = /require\(\)|ERR_REQUIRE|exports is not defined/.test(msg);
@@ -292,7 +294,9 @@ export async function buildProject(
           ...(cjs ? { suggestion: `scene files must load as ES modules: add ${rel(join(PROJECTS_DIR, "package.json"))} with {"type":"module"} (npx ct init does this)` } : {}),
         });
       }
-      if (def && typeof def.view !== "function") {
+      // A file that loads but exports no scene (no default export, or one without a view) is an error
+      // too: left alone, the film would render the "missing scene" placeholder and still build.
+      if (loaded && typeof def?.view !== "function") {
         findings.push({ source: "build", rule: "scene-export", severity: "error", scene: sc.id, message: `scenes/${sc.id}.tsx must \`export default scene({ view, motion })\`` });
         def = undefined;
       }
```

**Verify**: `npx vitest run tests/scene-export.test.ts` → 3 passed.

### Step 3: Full verification

**Verify**: `pnpm typecheck && pnpm lint` → exit 0, then `pnpm verify` → exit 0 with 0 failed.

## Test plan

`tests/scene-export.test.ts`: no default export → `scene-export`; a default export without a view →
`scene-export`; a correct scene → no errors. Each case gets its own fixture
directory under `build/` (gitignored), because Node caches a module by its path.

## Done criteria

- [ ] `npx vitest run tests/scene-export.test.ts` → all pass
- [ ] `pnpm verify` exits 0
- [ ] `git status --short` lists only: `src/build/build.ts`, `tests/scene-export.test.ts` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The diff in Step 2 does not apply cleanly, or its context lines do not match the file.
- In Step 1 the new tests do not fail the way the step says (the defect is not reproducing).
- After Step 2 a test in another file fails.

## Maintenance notes

- `src/build` is part of the engine hash, so every project starts a new iteration on its next `ct` command.
- If scene files ever gain a second valid export shape, `defaultExport()` and this check change together.
