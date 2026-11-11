# Plan 005: The MCP server survives a cancelled or failed tool call

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 25ad21d..HEAD -- src/mcp/run.ts src/mcp/tools.ts`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `25ad21d`, 2026-11-11

## Why this matters

`ct mcp` serves Cursor, Codex, VS Code and Claude Desktop. Each tool call runs
a child `ct` process, and calls on the same project are queued so that only one
runs at a time. The queue keeps a promise per project. When a call is rejected
— which is exactly what happens when the client cancels it — that stored
promise rejects with nobody listening, and Node ends the process on an
unhandled rejection. One cancelled `check` or `render` (the long calls people
do cancel) takes the whole server down, and every tool disappears until the
client restarts it.

A second defect sits next to it: a call that is cancelled while it is still
waiting in the queue is started anyway and runs to completion, with its result
thrown away. For `restore` or `new_project` that means work the user cancelled
still happens.

## Current state

- `src/mcp/run.ts` — `runCt` spawns the child process; `serialized` is the
  per-project queue. Both defects are here.
- `src/mcp/tools.ts:54-59` — the only caller. It already turns a rejection into
  a tool error, so nothing needs to change there:

  ```ts
    let run: CtRun;
    try {
      run = await (opts.key ? serialized(`${root}:${opts.key}`, go) : go());
    } catch (e) {
      return err(`ct ${args[0]} failed to run: ${(e as Error).message}`);
    }
  ```

`src/mcp/run.ts` today, lines 22–33 (the start of `runCt`):

```ts
export function runCt(
  args: string[],
  opts: { root: string; signal?: AbortSignal; onProgress?: (elapsedS: number, lastLine: string) => void; timeoutMs?: number },
): Promise<CtRun> {
  const dir = mkdtempSync(join(tmpdir(), "ct-mcp-"));
  const resultFile = join(dir, "result.json");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(PKG_ROOT, "bin", "ct.mjs"), ...args], {
      cwd: opts.root,
      env: { ...process.env, CT_ROOT: opts.root, CT_RESULT_FILE: resultFile, NO_COLOR: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
```

Lines 46–47 and 59–70 (how cancellation reaches the child, and where the
rejection comes from):

```ts
    const kill = () => child.kill("SIGTERM");
    opts.signal?.addEventListener("abort", kill, { once: true });
```

```ts
    child.on("close", (code) => {
      done();
      let result: Record<string, unknown> = {};
      try {
        result = JSON.parse(readFileSync(resultFile, "utf8"));
      } catch {
        /* the command produced no structured result (e.g. it crashed) */
      }
      rmSync(dir, { recursive: true, force: true });
      if (opts.signal?.aborted) return reject(new Error("cancelled"));
      resolve({ code: code ?? 1, log: log.replace(/@hf-progress[^\n]*\n?/g, ""), result });
    });
```

Lines 74–86 (the queue, to the end of the file):

```ts
/** Operations on one project run one at a time (builds rewrite build/<slug>); different projects run in parallel. */
const queues = new Map<string, Promise<unknown>>();
export function serialized<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  queues.set(
    key,
    next.finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    }),
  );
  return next;
}
```

What is wrong, precisely:

1. `next.finally(…)` is a new promise. When `next` rejects, it rejects too, and
   it is stored in the map with no handler. The caller's `try/catch` handles
   `next`, not this copy.
2. `queues.get(key) === next` is never true (the map holds the `finally`
   promise, not `next`), so entries are never removed.
3. An `"abort"` listener added to a signal that is already aborted never fires.
   A call cancelled while queued therefore spawns its child and lets it finish;
   only then does `opts.signal?.aborted` turn the result into `"cancelled"`.

Repo conventions that apply:

- TypeScript ES modules, 2-space indent, double quotes, semicolons. Relative
  imports end in `.js` even though the files are `.ts`.
- Comments are rare, full sentences, and say why. The existing comment at the
  top of `run.ts` is the model.
- Tests are vitest files named `tests/<name>.test.ts`. `tests/mcp.test.ts`
  drives the whole server over stdio; this plan adds a smaller unit file next
  to it rather than extending that one.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `pnpm install --frozen-lockfile` | exit 0 |
| One test file | `npx vitest run tests/mcp-run.test.ts` | all pass |
| The existing MCP tests | `npx vitest run tests/mcp.test.ts` | all pass (browser tests skipped) |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Everything | `pnpm verify` | exit 0; at `25ad21d` the suite is 288 passed, 26 skipped |

## Scope

**In scope** (the only files you should modify):
- `src/mcp/run.ts`
- `tests/mcp-run.test.ts` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):
- `src/mcp/tools.ts` — its `try/catch` is already right.
- `src/mcp/server.ts` — do not add a process-wide `unhandledRejection` handler.
  That would hide the next bug of this kind instead of fixing this one.
- How the child is killed (`SIGTERM` to the direct child only). Grandchildren
  (Chrome, ffmpeg) surviving a cancel is a separate, unconfirmed finding.
- `tests/mcp.test.ts`.

## Git workflow

- Branch: `advisor/005-mcp-server-survives-a-cancelled-call` (or the branch your operator gave you).
- One commit is enough. Message style is a plain sentence with an area prefix,
  for example `Runtime: gradient fields, a pure function of global time (0011)`.
  Suggested: `MCP: a cancelled or failed call no longer takes the server down`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing tests

Create `tests/mcp-run.test.ts` with exactly this content:

```ts
/** The MCP server's child runner and per-project queue (src/mcp/run.ts), without a client. */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCt, serialized } from "../src/mcp/run.js";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("serialized (one project's calls, one at a time)", () => {
  it("a rejected call leaves no unhandled rejection, and later calls still run", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (e: unknown) => unhandled.push(e);
    process.on("unhandledRejection", onUnhandled);
    try {
      await expect(serialized("rejects", () => Promise.reject(new Error("cancelled")))).rejects.toThrow("cancelled");
      await wait(50);
      expect(unhandled).toEqual([]);
      expect(await serialized("rejects", async () => 42)).toBe(42);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("runs one key's calls in order, and another key's alongside", async () => {
    const log: string[] = [];
    const job = (name: string, ms: number) => async () => {
      log.push(`start ${name}`);
      await wait(ms);
      log.push(`end ${name}`);
      return name;
    };
    const all = await Promise.all([serialized("a", job("a1", 40)), serialized("a", job("a2", 5)), serialized("b", job("b1", 5))]);
    expect(all).toEqual(["a1", "a2", "b1"]);
    expect(log.indexOf("end a1")).toBeLessThan(log.indexOf("start a2"));
    expect(log.indexOf("start b1")).toBeLessThan(log.indexOf("end a1"));
  });
});

describe("runCt", () => {
  it("a call cancelled before it starts runs nothing", async () => {
    const root = mkdtempSync(join(tmpdir(), "ct-mcp-run-"));
    writeFileSync(join(root, "package.json"), "{}");
    try {
      await expect(runCt(["new", "demo"], { root, signal: AbortSignal.abort() })).rejects.toThrow("cancelled");
      expect(existsSync(join(root, "projects", "demo"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
```

**Verify**: `npx vitest run tests/mcp-run.test.ts` → 2 failed, 1 passed:

- "a rejected call leaves no unhandled rejection…" fails on
  `expect(unhandled).toEqual([])` (it received one `cancelled` error). Vitest
  may also print "Unhandled Rejection" for the run; that is the same defect.
- "a call cancelled before it starts runs nothing" fails on the `existsSync`
  line (the project was created although the call was cancelled).
- "runs one key's calls in order…" passes.

### Step 2: Refuse to start a call that is already cancelled

In `src/mcp/run.ts`, inside `runCt`, insert two lines before
`const dir = mkdtempSync(join(tmpdir(), "ct-mcp-"));`:

```ts
  // Cancelled while it waited in the queue: run nothing.
  if (opts.signal?.aborted) return Promise.reject(new Error("cancelled"));
```

**Verify**: `npx vitest run tests/mcp-run.test.ts -t "cancelled before it starts"` → 1 passed.

### Step 3: Make the queue's stored promise unable to reject

In `src/mcp/run.ts`, replace the whole `serialized` function (the last eleven
lines of the file, from `export function serialized` to the closing `}`) with:

```ts
export function serialized<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(fn);
  // The stored tail never rejects: a failed or cancelled call is its caller's to handle, and an
  // unhandled rejection on a promise only the queue holds would take the whole server down.
  const tail: Promise<unknown> = next.then(
    () => undefined,
    () => undefined,
  );
  queues.set(key, tail);
  void tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return next;
}
```

The comment line and the `const queues = …` line above the function stay as
they are. `prev` can no longer reject (it is always a `tail` or
`Promise.resolve()`), which is why the old `prev.catch(…)` is gone.

**Verify**: `npx vitest run tests/mcp-run.test.ts` → 3 passed, and the run
prints no "Unhandled Rejection".

### Step 4: The server still works end to end

**Verify**: `npx vitest run tests/mcp.test.ts` → all pass (the browser-backed
tests are skipped without `CT_SLOW=1`; that is expected).

### Step 5: Full verification

**Verify**: `pnpm verify` → exit 0; 0 failed, and the passed count is 3 higher
than before this plan.

## Test plan

- New file `tests/mcp-run.test.ts`, three tests, no browser and no MCP client:
  - **the crash**: a rejected call leaves no unhandled rejection and the next
    call on the same key still runs;
  - ordering: one key's calls run strictly one after another while another
    key's call runs alongside (this passes before and after; it guards the
    rewrite of the queue);
  - **the queued cancel**: a call whose signal is already aborted rejects with
    `cancelled` and has no effect — proven by `ct new demo` not creating the
    project in a temp repo.
- The temp repo follows `tests/mcp.test.ts`: a temp dir with a `package.json`,
  passed as `root` (which `runCt` hands to the child as `CT_ROOT`).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx vitest run tests/mcp-run.test.ts` → 3 passed
- [ ] `npx vitest run tests/mcp.test.ts` → 0 failed
- [ ] `pnpm verify` exits 0
- [ ] `grep -c "next.finally" src/mcp/run.ts` → `0`
- [ ] `grep -c "if (opts.signal?.aborted) return Promise.reject(new Error(\"cancelled\"));" src/mcp/run.ts` → `1`
- [ ] `grep -rn "unhandledRejection" src/` prints nothing
- [ ] `git status --short` lists only `src/mcp/run.ts`, `tests/mcp-run.test.ts` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match `src/mcp/run.ts`.
- In Step 1 the first test passes before any change. The defect is then not
  reproducing as described; report what the run printed.
- After Step 3 the ordering test fails. The queue rewrite changed behaviour;
  do not adjust the test to make it pass.
- `tests/mcp.test.ts` fails after the change.
- You find yourself adding a process-level `unhandledRejection` or
  `uncaughtException` handler anywhere.

## Maintenance notes

- The rule the queue now follows: the promise returned to the caller may
  reject; anything the queue keeps for itself may not.
- If cancellation is extended to kill the child's whole process group (so
  Chrome and ffmpeg die with it), it belongs in `runCt` next to `kill`; the
  early return added in Step 2 stays first.
- A reviewer should check that a cancelled call still reaches the client as a
  tool error (`ct <command> failed to run: cancelled`, from
  `src/mcp/tools.ts:58`) rather than as a hang.
- Not covered: an end-to-end test that cancels a running tool call through a
  real MCP client. It needs a long-running, browserless command to cancel and
  was left out to keep the suite fast; the unit tests above cover both code paths.
