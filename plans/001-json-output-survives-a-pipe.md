# Plan 001: A `--json` document reaches a pipe whole

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 25ad21d..HEAD -- src/cli/index.ts tests/cli.test.ts`
> If `src/cli/index.ts` changed since this plan was written, compare the
> "Current state" excerpt against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `25ad21d`, 2026-11-11

## Why this matters

The `ct` CLI exits the moment a command returns. On Linux and macOS a pipe is
written asynchronously, so anything still waiting to be written is thrown away:
a `--json` document larger than the pipe's 64 KB buffer arrives cut off and is
not valid JSON. A pipe is how agents' shell tools, `| jq` and CI read `ct`
output, so `ct timeline --json`, `ct lint --json` and `ct check --json` silently
hand them broken data on any film of real size. Writing to a file or a terminal
is unaffected, which is why it has gone unnoticed.

Measured at commit `25ad21d`: `ct timeline _launch --json` writes 259,852 bytes
to a file and between 65,536 and about 150,000 bytes through a pipe.

## Current state

- `src/cli/index.ts` — the CLI entry: finds the command, runs it, exits with its
  return code. The defect is the last six lines.
- `src/cli/lib/log.ts` — `log()` is `console.log` (line 13). Every command prints
  through it.
- `src/cli/commands/timeline.ts:27` and `src/cli/lib/project.ts:63` — the two
  places that print a large JSON document, straight before the command returns.

The end of `src/cli/index.ts` today (lines 61–96):

```ts
async function main() {
  const [name, ...rest] = process.argv.slice(2);
  if (!name || name === "help" || name === "--help" || name === "-h") {
    help();
    return 0;
  }
  const cmd = COMMANDS.find((c) => c.name === name);
  if (!cmd) {
    fail(`unknown command "${name}"`);
    help();
    return 2;
  }
  const args = parseArgs(rest);
  if (args.flags.help || args.flags.h) {
    log(`${cmd.summary}\n\nusage: ${cmd.usage}`);
    return 0;
  }
  try {
    return await cmd.run(args);
  } catch (e) {
    if (e instanceof UsageError) {
      fail(e.message);
      log(`usage: ${cmd.usage}`);
      return 2;
    }
    throw e;
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    fail(e instanceof Error ? e.stack ?? e.message : String(e));
    process.exit(1);
  },
);
```

The explicit `process.exit` is deliberate and must stay: commands can leave
handles open (a browser, a local server, timers), and without it the process
would not end. The fix is to exit *after* the output has drained, not to remove
the exit.

Exit codes that must not change: `0` success, `1` a failing gate or a crash,
`2` a usage error or unknown command.

Repo conventions that apply:

- TypeScript ES modules, 2-space indent, double quotes, semicolons. Relative
  imports end in `.js` even though the files are `.ts`.
- Comments are rare, full sentences, and say why. Example from
  `src/cli/lib/store.ts:44`: `// write-then-rename: readers never see a half-written file`.
- Tests are vitest files named `tests/<name>.test.ts`. `tests/paths.test.ts` is
  a short exemplar of the style; `tests/mcp.test.ts` shows how this repo starts
  the CLI as a child process (`process.execPath` with `bin/ct.mjs`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `pnpm install --frozen-lockfile` | exit 0 |
| One test file | `npx vitest run tests/cli.test.ts` | all pass |
| Typecheck | `pnpm typecheck` | exit 0, no output after the header |
| Lint | `pnpm lint` | exit 0 |
| Everything | `pnpm verify` | exit 0; at `25ad21d` the suite is 288 passed, 26 skipped |

## Scope

**In scope** (the only files you should modify):
- `src/cli/index.ts`
- `tests/cli.test.ts` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):
- `src/cli/lib/log.ts` — do not replace `console.log` with synchronous writes;
  that changes every command and is not needed.
- `src/cli/commands/*.ts` — no command should gain its own exit or flush logic.
- `src/mcp/run.ts` — it reads the child's log through a pipe and benefits from
  this fix without any change.
- `bin/ct.mjs` — the launcher only imports the entry.

## Git workflow

- Branch: `advisor/001-json-output-survives-a-pipe` (or the branch your operator gave you).
- One commit is enough. Message style in this repo is a plain sentence with an
  area prefix, for example `Transitions: layered handoffs keep every layer's speed across the cut`.
  Suggested: `CLI: a --json document reaches a pipe whole`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing test

Create `tests/cli.test.ts` with exactly this content:

```ts
/**
 * The ct CLI as a child process with stdout on a pipe — how agents' shell tools,
 * `| jq` and CI read it.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PKG_ROOT } from "../src/paths.js";

function ct(args: string[]): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(PKG_ROOT, "bin", "ct.mjs"), ...args], { cwd: PKG_ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout }));
  });
}

describe("ct with stdout on a pipe", () => {
  it("prints a --json document larger than the pipe buffer whole", async () => {
    // _launch's timeline is about 260 KB; a pipe buffer is 64 KB.
    const r = await ct(["timeline", "_launch", "--json"]);
    expect(r.code).toBe(0);
    expect(Buffer.byteLength(r.stdout)).toBeGreaterThan(65536);
    expect(() => JSON.parse(r.stdout)).not.toThrow();
  });

  it("keeps its exit codes: 2 for an unknown command and for a usage error", async () => {
    expect((await ct(["no-such-command"])).code).toBe(2);
    expect((await ct(["timeline"])).code).toBe(2);
  });
});
```

**Verify**: `npx vitest run tests/cli.test.ts` → exactly 1 failed, 1 passed. The
failing test is "prints a --json document larger than the pipe buffer whole",
and the failure is on the `JSON.parse` line (a `SyntaxError`). If it fails on
the `toBeGreaterThan(65536)` line instead, see STOP conditions.

### Step 2: Exit after the output has drained

In `src/cli/index.ts`, replace the final block (the `main().then(…)` call shown
at the end of "Current state") with exactly this:

```ts
/**
 * Exit once stdout and stderr have drained. On POSIX a pipe is written asynchronously, so exiting
 * straight after printing cuts a large `--json` document off at the pipe's buffer (64 KB).
 */
function exit(code: number): void {
  process.exitCode = code;
  const done = () => process.exit(code);
  // A reader that went away (`ct … | head -1`) must not hang or crash the exit.
  process.stdout.once("error", done);
  process.stderr.once("error", done);
  process.stdout.write("", () => process.stderr.write("", done));
}

main().then(exit, (e) => {
  fail(e instanceof Error ? e.stack ?? e.message : String(e));
  exit(1);
});
```

Nothing else in the file changes. The empty write is queued behind everything
already printed, so its callback runs only after that output has been handed to
the pipe.

**Verify**: `npx vitest run tests/cli.test.ts` → 2 passed.

### Step 3: Confirm the behaviours a test does not cover

Run each command from the repo root.

1. A reader that stops early must not hang or print an error:

   ```bash
   node bin/ct.mjs timeline _launch --json 2>/tmp/ct-epipe.err | head -c 100 >/dev/null; echo "codes: ${PIPESTATUS[*]}"; wc -c < /tmp/ct-epipe.err
   ```

   Expected: returns within 10 seconds, prints `codes: 0 0`, then `0`.

2. Exit codes:

   ```bash
   node bin/ct.mjs --help >/dev/null; echo $?
   ```

   Expected: `0`.

   ```bash
   node bin/ct.mjs lint _defects --fast >/dev/null; echo $?
   ```

   Expected: `1` (`_defects` is a fixture that is meant to fail).

   ```bash
   node bin/ct.mjs lint example-type --fast >/dev/null; echo $?
   ```

   Expected: `0`.

3. A file still gets the whole document:

   ```bash
   node bin/ct.mjs timeline _launch --json > /tmp/ct-tl.json; node -e 'JSON.parse(require("fs").readFileSync("/tmp/ct-tl.json","utf8")); console.log("ok")'
   ```

   Expected: `ok`.

**Verify**: all three expectations hold.

### Step 4: Full verification

**Verify**: `pnpm verify` → exit 0; the test summary shows 0 failed and the
passed count is 2 higher than before this plan.

## Test plan

- New file `tests/cli.test.ts` with two tests:
  - the regression: a `--json` document over 64 KB parses after passing through a pipe;
  - exit codes 2 for an unknown command and for a missing `<project>`.
- Pattern: child-process start-up copied from `tests/mcp.test.ts`
  (`process.execPath` + `bin/ct.mjs`).
- Both tests run in the default suite (no browser needed), so `pnpm verify` and
  CI cover them.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx vitest run tests/cli.test.ts` → 2 passed
- [ ] `pnpm verify` exits 0
- [ ] `grep -c "process.exit(" src/cli/index.ts` prints `1` (the one inside `exit`)
- [ ] `grep -rn "process.exit" src/cli/commands src/cli/lib` prints nothing
- [ ] The three checks in Step 3 give the expected output
- [ ] `git status --short` lists only `src/cli/index.ts`, `tests/cli.test.ts` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The end of `src/cli/index.ts` does not match the excerpt in "Current state".
- In Step 1 the new test fails on `toBeGreaterThan(65536)`: the `_launch`
  timeline has shrunk below the pipe buffer, so the fixture no longer proves
  anything. Report the byte count; do not pick another project yourself.
- In Step 1 the new test passes before you change `src/cli/index.ts`: the
  defect is not reproducing in your environment (for example on Windows, where
  pipes are written synchronously). Report it.
- After Step 2 any `ct` command takes more than 10 seconds to return after
  printing its last line, or `node bin/ct.mjs --help` does not return at all.
- The Step 3 pipeline prints codes other than `0 0`, or anything on stderr.

## Maintenance notes

- Every exit from the CLI must go through `exit()` in `src/cli/index.ts`. A
  command that calls `process.exit` itself brings the truncation back for its
  own output; the fourth done criterion is the check to keep.
- If stdout is ever switched to synchronous writes for pipes, `exit()` becomes
  redundant but harmless.
- A reviewer should check that the exit codes in Step 3 are unchanged and that
  `ct mcp` still stays up until its client closes stdin (it awaits that before
  returning, see `src/cli/commands/mcp.ts:44-48`; this plan does not touch it).
- Deferred: an automated test for the reader-goes-away case. It was verified by
  hand (Step 3) because a reliable version needs careful stream teardown.
