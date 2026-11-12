# Plan 006: The frame-budget test is measured on its own in CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 25ad21d..HEAD -- tests/browser.slow.test.ts .github/workflows/docker.yml`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live files before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P1 (land before plan 002 is merged)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `25ad21d`, 2026-11-12

## Why this matters

One test in the browser suite, "fits the frame budget", times how long a
gradient-field frame takes with a wall clock and fails above 25 ms. In CI it
runs while the rest of the suite (other test files, Chrome, HyperFrames, child
`ct` processes) uses the same four cores, so it measures how busy the runner is.
It failed on 4 of the last 5 Docker runs with values of 25.7–36.9 ms, including
two commits that changed only Markdown; alone it measures 13–16 ms.

A red check that is not about the code trains people to ignore red checks, and
once plan 002 lands this test would block a release by chance. The fix keeps
the budget and the test exactly as they are and gives the measurement a quiet
machine: CI runs the suite without this one test, then runs this test by itself.

## Current state

- `tests/browser.slow.test.ts` — the browser suite. Line 23–24 gate it on
  `CT_SLOW=1`. The timing test is at lines 510–536.
- `.github/workflows/docker.yml` — line 54–59 run the suite inside the pinned
  toolchain image. It is also called by `release.yml`.

`tests/browser.slow.test.ts`, lines 510–513:

```ts
  // A timing test inside a parallel suite: alone the field measures 13-16 ms a frame, but once, with
  // HyperFrames rendering beside it on the same 4 cores, 25.7 ms. A retry asks for one uncontended
  // run; the budget itself does not move (docs/decisions/0011 §5).
  it("fits the frame budget", { retry: 2 }, async () => {
```

and its last two lines (534–535):

```ts
    console.log(`gradient field: ${got.medianGradient.toFixed(1)} ms/frame median, ${got.medianSolid.toFixed(1)} ms without it`);
    expect(got.medianGradient - got.medianSolid).toBeLessThanOrEqual(25);
```

`.github/workflows/docker.yml`, lines 53–59:

```yaml
      # The goldens were made on x86-64 Chrome; arm64 Skia may differ within a pixel.
      - name: Browser tests on the pinned toolchain (golden frames, seeded defects)
        if: matrix.arch == 'amd64'
        run: >
          docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1
          -v "$PWD:/repo" -w /repo continuity:toolchain
          bash -c 'pnpm install --frozen-lockfile && CT_SLOW=1 pnpm test'
```

Facts that shape the change:

- `pnpm test` is `vitest run`. Vitest runs test files in parallel; `-t "<text>"`
  runs only tests whose name contains that text.
- The 25 ms budget is a recorded decision (`docs/decisions/0011-moving-backgrounds.md`
  §5: measured 12.6, 15.3, 15.7 ms). It must not change.
- Developers run the whole suite with `CT_SLOW=1 pnpm test` (README, CLAUDE.md).
  That command must keep running this test.

Conventions: TypeScript, 2-space indent, double quotes, semicolons; comments
are rare, full sentences, and say why.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile` | exit 0 |
| Is a browser available | `node bin/ct.mjs doctor` | a `✔ chrome` line |
| The timing test alone | `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"` | `1 passed \| 21 skipped` |
| Everything browserless | `pnpm verify` | exit 0; 288 passed, 26 skipped at `25ad21d` |

## Scope

**In scope** (the only files you should modify):
- `tests/browser.slow.test.ts` (the comment and the `it(` line of one test)
- `.github/workflows/docker.yml` (one `run:` command)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):
- The budget (`25`), the `retry: 2`, and the body of the test.
- Any other test, `vitest.config.ts`, `package.json` scripts, README, CLAUDE.md.
- `.github/workflows/release.yml` and `ci.yml`.
- Do not skip, delete or weaken the test. It must still run in CI and still
  fail the job when the budget is exceeded.

## Git workflow

- Branch: `advisor/006-frame-budget-test-runs-uncontended` (or the branch your operator gave you).
- One commit. Message style is a plain sentence with an area prefix.
  Suggested: `Tests: the frame budget is measured on its own in CI`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Let the suite be run without the timing test

In `tests/browser.slow.test.ts`, replace lines 510–513 (the three comment lines
and the `it(` line shown in "Current state") with:

```ts
  // A wall-clock measurement: alone the field costs 13-16 ms a frame, but beside the rest of the
  // suite on the same 4 cores it has measured 25-37 ms. CI therefore runs the suite with
  // CT_BUDGET=0 (this test skipped) and then this test by itself, by name (docker.yml): keep the
  // name and that command in step. The budget itself does not move (docs/decisions/0011 §5).
  it.skipIf(process.env.CT_BUDGET === "0")("fits the frame budget", { retry: 2 }, async () => {
```

Nothing else in the test changes.

**Verify** (needs a browser; run `node bin/ct.mjs doctor` first — if there is
no `✔ chrome` line, see STOP conditions):

- `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"`
  → `Tests  1 passed | 21 skipped (22)`.
- `CT_SLOW=1 CT_BUDGET=0 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"`
  → `Tests  22 skipped (22)` and exit code 0.

### Step 2: Run it by itself in CI

In `.github/workflows/docker.yml`, replace the last line of the step shown in
"Current state":

```yaml
          bash -c 'pnpm install --frozen-lockfile && CT_SLOW=1 pnpm test'
```

with:

```yaml
          bash -c 'pnpm install --frozen-lockfile && CT_SLOW=1 CT_BUDGET=0 pnpm test
          && CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"'
```

Keep the ten-space indentation. The `run: >` scalar folds both lines into one
command, so the timing test starts only after the rest of the suite has passed
and finished.

**Verify**:

```bash
python3 - <<'EOF'
import yaml
w = yaml.safe_load(open(".github/workflows/docker.yml"))
steps = w["jobs"]["test"]["steps"]
run = next(s["run"] for s in steps if s.get("name", "").startswith("Browser tests"))
assert "CT_SLOW=1 CT_BUDGET=0 pnpm test && CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t \"fits the frame budget\"'" in run, run
assert run.count("\n") <= 1, repr(run)
print("docker.yml ok")
EOF
```

→ prints `docker.yml ok`. If Python has no `yaml` module, check by eye instead
with `grep -n -A2 "CT_BUDGET=0" .github/workflows/docker.yml`.

### Step 3: The name in the workflow matches the test

**Verify**: `grep -c 'fits the frame budget' tests/browser.slow.test.ts` → `1`,
and `grep -c 'fits the frame budget' .github/workflows/docker.yml` → `1`.

### Step 4: Full verification

**Verify**: `pnpm verify` → exit 0 with the same counts as before this plan
(the browser suite is skipped without `CT_SLOW=1`), and `git status --short`
lists only the two in-scope files.

## Test plan

No new test: this plan changes where an existing test runs. The checks are the
two vitest runs in Step 1 (the test still runs by default; `CT_BUDGET=0` skips
it), the structure check in Step 2, and the Docker workflow on the pull request,
whose `test (amd64)` job must pass and whose log must show the suite finishing
and then a second vitest run with `1 passed`.

## Done criteria

- [ ] `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"` → 1 passed, 21 skipped
- [ ] `CT_SLOW=1 CT_BUDGET=0 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"` → 22 skipped, exit 0
- [ ] The Step 2 script prints `docker.yml ok`
- [ ] `grep -c "toBeLessThanOrEqual(25)" tests/browser.slow.test.ts` → `1` and `grep -c "retry: 2" tests/browser.slow.test.ts` → `1`
- [ ] `pnpm verify` exits 0
- [ ] `git status --short` lists only `tests/browser.slow.test.ts`, `.github/workflows/docker.yml` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live files.
- There is no headless Chrome (`ct doctor` shows no `✔ chrome`): do Steps 1–4
  without the two vitest runs and say plainly in your report that they were
  not run.
- The timing test fails when run alone (Step 1, first command), after its own
  retries. Report the `gradient field: … ms/frame` line it prints. Do not
  raise the budget or add retries.
- You find yourself wanting to change the budget, the retry count, or to skip
  the test in CI altogether.

## Maintenance notes

- The workflow selects the test by name. Renaming the test without changing
  `docker.yml` would make the second run match nothing and pass silently; the
  comment on the test says so, and Step 3's two greps are the check to keep.
- If the test still fails alone on the CI runner, the runner itself is slower
  than the machines the budget was measured on. That is then a real question
  for decision 0011 (the budget or the shader), not something to retry away.
- `CT_SLOW=1 pnpm test` on a developer machine is unchanged and still runs
  this test beside the others, with its two retries.
- Other wall-clock assertions added to the browser suite should use the same
  `CT_BUDGET` switch rather than a new one.
