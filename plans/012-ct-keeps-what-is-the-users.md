# Plan 012: `ct restore`, `ct new` and `ct init` keep what is the user's

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 09b0d13..HEAD -- src/cli/lib/store.ts src/cli/commands/iterate.ts src/cli/commands/new.ts src/cli/commands/init.ts tests/store.test.ts`
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

Three commands can destroy a user's work without a copy anywhere:

1. `ct restore <project> <n>` deletes the project's sources and copies iteration
   `n` over them. Sources are only snapshotted by `ct check`, `stills`, `sheet`,
   `score` and `render`; the edit hook runs `ct lint`, which does not snapshot.
   Edits made since the last of those commands are gone.
2. `ct new` and `ct init` write `{ "type": "module" }` to `<projectsDir>/package.json`
   so scene files load as ES modules. If that file already exists (the projects
   dir is a workspace package, or `"."`), it is replaced wholesale: name, scripts
   and dependencies are lost.
3. `ct init` refreshes a managed block in `CLAUDE.md` and `.gitignore` between a
   begin and an end marker. If the end marker has been edited away, everything
   after the begin marker is dropped.

After this plan: restore first keeps what is on disk as an iteration and says
its number; the other two refuse with a usage error that names the fix, and
change nothing.

## Current state

- `src/cli/lib/store.ts` — `restoreIteration(slug, n)`: for each of
  `storyboard.json`, `scenes`, `lib`, `theme.ts`, `assets` it removes the
  project's copy and copies the snapshot's. `currentIteration(slug)` returns the
  iteration for the sources on disk, creating it (with a snapshot) when they are new.
- `src/cli/commands/iterate.ts` — the `restore` command calls `restoreIteration`.
- `src/cli/commands/new.ts` — `ensureEsmProjects()` walks up from the projects
  dir to the nearest `package.json`; unless that one is `"type": "module"` it
  writes a new `package.json` into the projects dir, even when the one it found
  *is* that file.
- `src/cli/commands/init.ts` — `upsertBlock()`: with a begin marker but no end
  marker it writes `cur.slice(0, begin) + managed + "\n"`.
- A `UsageError` (from `src/cli/lib/args.ts`) is printed with the command's
  usage and exits 2.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile` | exit 0 |
| The new tests | `npx vitest run tests/store.test.ts tests/init.test.ts` | all pass |
| Typecheck and lint | `pnpm typecheck && pnpm lint` | exit 0 |
| Everything | `pnpm verify` | exit 0; at `09b0d13` the suite is 304 passed, 26 skipped |

Conventions: TypeScript ES modules, 2-space indent, double quotes, semicolons;
relative imports end in `.js`. Comments are rare, full sentences, and say why.
The code and tests below were run against `09b0d13` before this plan was written:
the tests fail without the change and pass with it, and the whole suite
(including the browser suite) passes with it.

## Scope

**In scope**: `src/cli/lib/store.ts` (`restoreIteration` only), `src/cli/commands/iterate.ts` (the `restore` command only), `src/cli/commands/new.ts` (`ensureEsmProjects` only), `src/cli/commands/init.ts` (`upsertBlock` and one import), `tests/store.test.ts` (one import and one appended block), `tests/init.test.ts` (create), `plans/README.md` (status row).

**Out of scope**: the state lock, `currentIteration`, what `ct init` grants in `.claude/settings.json`, merging into a user's `package.json` (refusing is deliberate: adding `"type": "module"` to someone's package can break it).

## Git workflow

- Branch: `advisor/012-ct-keeps-what-is-the-users` (or the branch your operator gave you).
- One commit. Message style is a plain sentence with an area prefix. Suggested: `CLI: restore, new and init keep what is the user's`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing tests

Change `tests/store.test.ts` exactly as this diff shows:

```diff
diff --git a/tests/store.test.ts b/tests/store.test.ts
index d6db005..f83c8fe 100644
--- a/tests/store.test.ts
+++ b/tests/store.test.ts
@@ -3,7 +3,7 @@
  * imported, so CT_ROOT is set before the store is imported: every import of engine code in this
  * file is dynamic for that reason. Do not add a static import of anything under src/.
  */
-import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
+import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { afterAll, beforeAll, describe, expect, it } from "vitest";
@@ -84,3 +84,15 @@ describe("iterationForHash", () => {
     expect(store.iterationForHash(state, "zzz")).toBeUndefined();
   });
 });
+
+describe("restoreIteration", () => {
+  it("keeps edits that were never snapshotted as an iteration before replacing them", () => {
+    writeFileSync(sceneFile(), "export default 10;\n");
+    const first = store.currentIteration("demo").n;
+    writeFileSync(sceneFile(), "export default 11;\n");
+    const saved = store.restoreIteration("demo", first);
+    expect(readFileSync(sceneFile(), "utf8")).toBe("export default 10;\n");
+    expect(saved).toBeGreaterThan(first);
+    expect(readFileSync(join(store.iterationDir("demo", saved), "src", "scenes", "a.tsx"), "utf8")).toBe("export default 11;\n");
+  });
+});
```

Create `tests/init.test.ts` with exactly this content:

```ts
/** `ct init` in throwaway repos: it must not drop or overwrite what is the user's. */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PKG_ROOT } from "../src/paths.js";

const made: string[] = [];
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "ct-init-"));
  made.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}
const init = (root: string) => spawnSync(process.execPath, [join(PKG_ROOT, "bin", "ct.mjs"), "init"], { cwd: root, env: { ...process.env, CT_ROOT: root }, encoding: "utf8" });

describe("ct init", () => {
  it("refuses a managed block whose end marker is gone, and leaves the file alone", () => {
    const claude = "# Mine\n\n<!-- continuity:begin (managed by `npx ct init`) -->\nold block\n\n## My own notes below\nkeep me\n";
    const root = repo({ "package.json": '{ "type": "module" }\n', "CLAUDE.md": claude });
    const r = init(root);
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/without "<!-- continuity:end -->"/);
    expect(readFileSync(join(root, "CLAUDE.md"), "utf8")).toBe(claude);
  });

  it("refuses to replace a package.json that the projects dir already has", () => {
    const pkg = '{\n  "name": "videos",\n  "scripts": { "build": "tsc" }\n}\n';
    const root = repo({ "package.json": "{}\n", "continuity.json": '{ "projectsDir": "videos" }\n', "videos/package.json": pkg });
    const r = init(root);
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/is not an ES module package/);
    expect(readFileSync(join(root, "videos", "package.json"), "utf8")).toBe(pkg);
  });

  it("still sets up a plain repo", () => {
    const root = repo({ "package.json": "{}\n" });
    const r = init(root);
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(join(root, "projects", "package.json"), "utf8"))).toEqual({ type: "module" });
    expect(readFileSync(join(root, "CLAUDE.md"), "utf8")).toMatch(/continuity:end/);
  });
});
```

**Verify**: `npx vitest run tests/store.test.ts tests/init.test.ts` → 3 failed, 6 passed. The failures are the new restore test and the two "refuses" cases in `tests/init.test.ts`; "still sets up a plain repo" passes before and after.

### Step 2: Make the change

Apply exactly this diff (by hand, or save it to a file and run `git apply <file>`). Do not change anything else in these files.

```diff
diff --git a/src/cli/commands/init.ts b/src/cli/commands/init.ts
index 60f20ad..83f5540 100644
--- a/src/cli/commands/init.ts
+++ b/src/cli/commands/init.ts
@@ -1,6 +1,7 @@
 import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
 import { dirname, join, relative } from "node:path";
 import { CONFIG_FILE, PKG_ROOT, PROJECTS_DIR, WORK_CONFIG, WORK_ROOT, depDir, rel } from "../../paths.js";
+import { UsageError } from "../lib/args.js";
 import type { Command } from "../lib/command.js";
 import { color, log, ok } from "../lib/log.js";
 import { emitResult } from "../lib/result.js";
@@ -34,7 +35,9 @@ function upsertBlock(file: string, block: string, wrap: (s: string) => string):
   if (begin >= 0) {
     const endMarker = wrap("").split("\n").at(-1)!;
     const end = cur.indexOf(endMarker, begin);
-    next = cur.slice(0, begin) + managed + (end >= 0 ? cur.slice(end + endMarker.length) : "\n");
+    // Without its end marker the block has no known extent: replacing it would drop whatever follows.
+    if (end < 0) throw new UsageError(`${rel(file)} has "${wrap("").split("\n")[0]}" without "${endMarker}": restore that line (or delete the block) and run ct init again`);
+    next = cur.slice(0, begin) + managed + cur.slice(end + endMarker.length);
   } else next = cur.replace(/\n*$/, "\n\n") + managed + "\n";
   if (next === cur) return "unchanged";
   writeFileSync(file, next);
diff --git a/src/cli/commands/iterate.ts b/src/cli/commands/iterate.ts
index 06f41ce..c273254 100644
--- a/src/cli/commands/iterate.ts
+++ b/src/cli/commands/iterate.ts
@@ -86,9 +86,9 @@ export const restore: Command = {
     const s = readState(slug);
     const n = a._[1] === "best" ? s.best : Number(a._[1]);
     if (!n) throw new UsageError("which iteration? (number or 'best')");
-    restoreIteration(slug, n);
-    emitResult({ restored: n });
-    ok(`restored iteration ${n} sources into projects/${slug}`);
+    const saved = restoreIteration(slug, n);
+    emitResult({ restored: n, saved });
+    ok(`restored iteration ${n} sources into projects/${slug} (what was there is kept as iteration ${saved})`);
     return 0;
   },
 };
diff --git a/src/cli/commands/new.ts b/src/cli/commands/new.ts
index 0fc6b1a..c924679 100644
--- a/src/cli/commands/new.ts
+++ b/src/cli/commands/new.ts
@@ -19,8 +19,13 @@ export function ensureEsmProjects(): boolean {
     }
     if (dirname(dir) === dir) break;
   }
+  const own = join(PROJECTS_DIR, "package.json");
+  // The projects dir is a package of its own (a workspace, or the repo root): that file is the user's.
+  if (existsSync(own)) {
+    throw new UsageError(`${rel(own)} is not an ES module package, and scene files must load as ES modules: add "type": "module" to it, or point "projectsDir" in continuity.json at a folder of its own`);
+  }
   mkdirSync(PROJECTS_DIR, { recursive: true });
-  writeFileSync(join(PROJECTS_DIR, "package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");
+  writeFileSync(own, JSON.stringify({ type: "module" }, null, 2) + "\n");
   return true;
 }
 
diff --git a/src/cli/lib/store.ts b/src/cli/lib/store.ts
index f80826a..83b1355 100644
--- a/src/cli/lib/store.ts
+++ b/src/cli/lib/store.ts
@@ -168,14 +168,20 @@ export function recordCheck(slug: string, builtHash: string, findings: Finding[]
   return { iteration: it.n, findingsFile: join(it.dir, name), findings, stale: false };
 }
 
-/** Restore a previous iteration's sources into the project (for "keep the best"). */
-export function restoreIteration(slug: string, n: number) {
+/**
+ * Restore a previous iteration's sources into the project (for "keep the best"). What is on disk
+ * is kept first as an iteration of its own, and its number returned: the edit hook only lints, so
+ * sources edited since the last check, still or sheet have no snapshot yet.
+ */
+export function restoreIteration(slug: string, n: number): number {
   const src = join(iterationDir(slug, n), "src");
   if (!existsSync(src)) throw new Error(`iteration ${n} has no source snapshot`);
+  const saved = currentIteration(slug).n;
   for (const name of SNAPSHOT) {
     const to = join(projectDir(slug), name);
     const from = join(src, name);
     if (existsSync(to)) rmSync(to, { recursive: true, force: true });
     if (existsSync(from)) cpSync(from, to, { recursive: true });
   }
+  return saved;
 }
```

**Verify**: `npx vitest run tests/store.test.ts tests/init.test.ts` → 9 passed, and `npx vitest run tests/mcp.test.ts` → 0 failed.

### Step 3: Full verification

**Verify**: `pnpm typecheck && pnpm lint` → exit 0, then `pnpm verify` → exit 0 with 0 failed.

## Test plan

- `tests/store.test.ts` (appended): an edit that was never snapshotted survives a
  restore as its own iteration, and the project holds the restored sources.
- `tests/init.test.ts` (new, runs `ct init` in throwaway repos): a `CLAUDE.md`
  with a begin marker and no end marker is refused and left byte-identical; a
  projects dir with its own `package.json` is refused and that file left
  byte-identical; a plain repo is still set up.

## Done criteria

- [ ] `npx vitest run tests/store.test.ts tests/init.test.ts` → all pass
- [ ] `pnpm verify` exits 0
- [ ] `git status --short` lists only: `src/cli/lib/store.ts`, `src/cli/commands/iterate.ts`, `src/cli/commands/new.ts`, `src/cli/commands/init.ts`, `tests/store.test.ts`, `tests/init.test.ts` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The diff in Step 2 does not apply cleanly, or its context lines do not match the file.
- In Step 1 the new tests do not fail the way the step says (the defect is not reproducing).
- After Step 2 a test in another file fails.
- `tests/store.test.ts` does not match the diff's context (it was added by an earlier change; its first line of imports and its last block are what this plan touches).
- You find yourself wanting to merge fields into a user's `package.json` instead of refusing.

## Maintenance notes

- Each `ct restore` now adds one iteration (the state it replaced). `ct status` shows it; that is the record of what was there.
- The MCP `restore` tool goes through the same code and gains `saved` in its result.
- `ct init` on a repo with a damaged marker now stops before touching `.claude/settings.json`; re-running after the marker is repaired completes the set-up.
- Not covered: `ct init` with a malformed `.claude/settings.json` still fails with a raw JSON error after earlier steps have run.
