# Plan 002: The browser suite must pass before anything is published to npm

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 25ad21d..HEAD -- .github/workflows/release.yml .github/workflows/docker.yml docs/decisions/0004-docker.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (land before the next release)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests (release pipeline)
- **Planned at**: commit `25ad21d`, 2026-11-11

## Why this matters

The release workflow publishes to npm first and runs the browser suite
afterwards. The browser suite is the only place the real render path is tested:
golden frames, the seeded layout defects, the runtime, WebGL shots and the MCP
browser tools. The publish job runs only `pnpm verify`, where those 26 tests
are skipped.

An npm version cannot be republished. If a release breaks rendering, users get
it, the failure shows up minutes later in a different job, and the only repair
is a new version. After this plan a red browser suite stops the release before
`npm publish` runs.

## Current state

- `.github/workflows/release.yml` — two jobs. `publish` verifies, publishes to
  npm and cuts the GitHub release. `image` runs after it and calls `docker.yml`.
- `.github/workflows/docker.yml` — a reusable workflow (`workflow_call`). Its
  `test` job builds both Docker images on amd64 and arm64 and runs
  `CT_SLOW=1 pnpm test` (the browser suite) inside the amd64 toolchain image.
  Its `publish` job pushes images and only runs when the input `publish` is true.
  **This file is not modified by this plan.**
- `.github/workflows/ci.yml` — runs on every push; it runs `pack-smoke.mjs`
  twice (npm, then `--pm pnpm`). The release runs only the first.
- `docs/decisions/0004-docker.md` — the decision record that describes this
  pipeline; one paragraph must be updated to match.

`release.yml` today, lines 20–70 (the whole `jobs:` section):

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    env:
      PUPPETEER_SKIP_DOWNLOAD: "1"
      HYPERFRAMES_NO_TELEMETRY: "1"
      DO_NOT_TRACK: "1"
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - name: Tag, package.json and plugin.json versions agree
        run: |
          …
      - run: pnpm verify
      - run: pnpm -s ct licenses
      - run: node scripts/pack-smoke.mjs
      - name: npm with trusted publishing support (≥ 11.5)
        run: npm install -g npm@11.20.0 && npm -v
      - name: Publish to npm
        run: npm publish --provenance --access public
        …
      - name: GitHub release
        …

  # Docker images for the same commit → ghcr.io (amd64 + arm64). A job here rather than a
  # tag trigger in docker.yml: tags created by `gh release create` above trigger no workflows.
  image:
    needs: publish
    permissions:
      contents: read
      packages: write
    uses: ./.github/workflows/docker.yml
    with:
      publish: true
```

The relevant parts of `docker.yml`:

```yaml
on:
  …
  workflow_call:
    inputs:
      publish:
        type: boolean
        default: false

permissions:
  contents: read

jobs:
  test:
    …
      - name: Browser tests on the pinned toolchain (golden frames, seeded defects)
        if: matrix.arch == 'amd64'
        run: >
          docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1
          -v "$PWD:/repo" -w /repo continuity:toolchain
          bash -c 'pnpm install --frozen-lockfile && CT_SLOW=1 pnpm test'
  publish:
    if: inputs.publish
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
```

`docs/decisions/0004-docker.md`, lines 44–50:

```markdown
### 5. Release pushes images from release.yml
`docker.yml` is reusable: on pushes and PRs it builds both targets on amd64 and arm64
(native runners), runs the browser suite (golden frames, seeded defects, MCP browser tools)
inside the amd64 toolchain image, and drives the `ct` image like a user
(`doctor → init → new → check → render --draft`). `release.yml` calls it with
`publish: true` after npm publishing — a tag trigger would miss manual releases, whose tags
are created with `GITHUB_TOKEN` and trigger no workflows.
```

Two facts about GitHub Actions that shape the change:

1. A job that calls a reusable workflow must grant at least the permissions the
   called workflow's jobs declare, even for a job that will be skipped.
   `docker.yml`'s `publish` job declares `packages: write`, so the new calling
   job needs the same `permissions` block the existing `image` job has. The
   `test` job still runs with `contents: read` only, because `docker.yml` sets
   that at its top level.
2. A workflow may call the same reusable workflow from two jobs.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Structure check | the Python script in Step 3 | prints `release.yml ok` |
| Fallback when PyYAML is missing | the `grep` commands in Step 3 | the listed output |
| Repo checks still pass | `pnpm verify` | exit 0 |

GitHub Actions cannot be run locally and `actionlint` is not installed in this
repo. Verification here is structural; the real proof is the next release (see
Maintenance notes).

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/release.yml`
- `docs/decisions/0004-docker.md` (section 5 and one consequence line)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):
- `.github/workflows/docker.yml` — it already has everything needed. Do not add
  inputs to skip its tests on the second call; that optimisation is deferred
  on purpose (see Maintenance notes).
- `.github/workflows/ci.yml`.
- The `Publish to npm` step, the `NODE_AUTH_TOKEN` line, the version check
  step, action versions and workflow-level `permissions`. Hardening those is a
  separate finding; changing them here mixes two risks in one release.
- The `on:` triggers of `release.yml` (tag push and manual run on any branch are
  documented behaviour).

## Git workflow

- Branch: `advisor/002-browser-suite-gates-npm-publish` (or the branch your operator gave you).
- One commit. Message style is a plain sentence with an area prefix, for example
  `Docs: the README, skills and 0011 match the fields as built`.
  Suggested: `Release: the browser suite passes before npm publish`.
- Do NOT push or open a PR unless the operator instructed it. Never push a `v*`
  tag and never start the Release workflow: either one publishes the package.

## Steps

### Step 1: Add the gate job and make `publish` wait for it

In `.github/workflows/release.yml`, replace these three lines:

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
```

with:

```yaml
jobs:
  # The browser suite (golden frames, seeded layout defects, MCP browser tools) on the pinned
  # toolchain image. An npm version cannot be republished, so this must pass before `publish`.
  # packages: write mirrors the `image` job: docker.yml's own publish job declares it, and a
  # called workflow may not ask for more than its caller grants (that job is skipped here).
  browser:
    permissions:
      contents: read
      packages: write
    uses: ./.github/workflows/docker.yml
    with:
      publish: false

  publish:
    needs: browser
    runs-on: ubuntu-latest
```

Keep the indentation exactly: job names are indented two spaces, their keys four.

**Verify**: `grep -n "^  browser:\|^    needs: browser\|^  publish:\|^  image:" .github/workflows/release.yml`
→ four lines, in this order: `browser:`, `publish:`, `needs: browser`, `image:`.

### Step 2: Run the pnpm pack smoke in the release too

In the `publish` job's steps, replace this line:

```yaml
      - run: node scripts/pack-smoke.mjs
```

with:

```yaml
      - run: node scripts/pack-smoke.mjs
      - run: node scripts/pack-smoke.mjs --pm pnpm
```

This matches `ci.yml`, which runs both.

**Verify**: `grep -c "pack-smoke.mjs" .github/workflows/release.yml` → `2`.

### Step 3: Check the structure

Run from the repo root:

```bash
python3 - <<'EOF'
import yaml
w = yaml.safe_load(open(".github/workflows/release.yml"))
j = w["jobs"]
assert list(j) == ["browser", "publish", "image"], list(j)
assert j["browser"]["uses"] == "./.github/workflows/docker.yml"
assert j["browser"]["with"] == {"publish": False}
assert j["browser"]["permissions"] == {"contents": "read", "packages": "write"}
assert j["publish"]["needs"] == "browser"
assert j["image"]["needs"] == "publish" and j["image"]["with"] == {"publish": True}
runs = [s.get("run", "") for s in j["publish"]["steps"]]
at = lambda needle: next(k for k, r in enumerate(runs) if needle in r)
assert at("pnpm verify") < at("pack-smoke.mjs --pm pnpm") < at("npm publish")
print("release.yml ok")
EOF
```

**Verify**: prints `release.yml ok`.

If Python reports `No module named 'yaml'`, use this fallback instead and check
each result by eye:

```bash
grep -n -A6 "^  browser:" .github/workflows/release.yml
```

Expected: the `permissions` block with `contents: read` and `packages: write`,
`uses: ./.github/workflows/docker.yml`, `with:` and `publish: false`.

```bash
grep -n "needs:" .github/workflows/release.yml
```

Expected: exactly two lines, `needs: browser` then `needs: publish`.

### Step 4: Update the workflow's header comment

At the top of `release.yml`, the comment block starts:

```yaml
# Publishes @litterthanlit/continuity to npm with provenance, cuts a GitHub release and
# pushes the Docker images (ghcr.io/litterthanlit/continuity, via docker.yml).
```

Add one line directly after those two:

```yaml
# Nothing is published until the browser suite has passed (the `browser` job, docker.yml).
```

**Verify**: `grep -c "Nothing is published until the browser suite has passed" .github/workflows/release.yml` → `1`.

### Step 5: Bring the decision record in line

In `docs/decisions/0004-docker.md`, replace this sentence (it spans lines 48–50):

```markdown
`release.yml` calls it with
`publish: true` after npm publishing — a tag trigger would miss manual releases, whose tags
are created with `GITHUB_TOKEN` and trigger no workflows.
```

with:

```markdown
`release.yml` calls it twice.
The first call (`publish: false`) is a gate before npm publishing: an npm version cannot be
republished, so the browser suite has to pass first. The second (`publish: true`) pushes the
images after npm publishing — a tag trigger would miss manual releases, whose tags are created
with `GITHUB_TOKEN` and trigger no workflows.
```

The text before it on line 48 (`(`doctor → init → new → check → render --draft`).`) stays.

Then, in the `## Consequences` list of the same file, add this bullet after the
first one (the one that starts "The browser suite now runs in CI"):

```markdown
- A release runs the image tests twice, once as the gate and once before the push. The second
  run mostly hits the build cache; skipping it is possible but not worth the extra workflow logic yet.
```

**Verify**: `grep -c "calls it twice" docs/decisions/0004-docker.md` → `1`, and
`grep -c "after npm publishing — a tag trigger" docs/decisions/0004-docker.md` → `1`.

### Step 6: Confirm nothing else moved

**Verify**:
- `git diff --stat` lists only `.github/workflows/release.yml`,
  `docs/decisions/0004-docker.md` and `plans/README.md`.
- `git diff .github/workflows/docker.yml` prints nothing.
- `pnpm verify` exits 0 (no source changed, so this is a sanity check).

## Test plan

There is no unit test for a workflow file. The checks are:

- the structure script in Step 3 (it fails on the file as it is at `25ad21d`
  with an `AssertionError`, and passes after Steps 1–2);
- on the pull request for this change, the existing `CI` and `Docker` workflows
  must stay green — they prove `docker.yml` still works when called;
- the next real release (see Maintenance notes).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] The Step 3 script prints `release.yml ok` (or the fallback greps match)
- [ ] `grep -c "pack-smoke.mjs" .github/workflows/release.yml` → `2`
- [ ] `git diff .github/workflows/docker.yml .github/workflows/ci.yml` prints nothing
- [ ] `grep -c "calls it twice" docs/decisions/0004-docker.md` → `1`
- [ ] `pnpm verify` exits 0
- [ ] `git status --short` lists only the three in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `jobs:` section of `release.yml` or the quoted parts of `docker.yml` do
  not match "Current state" — in particular if `docker.yml` no longer has a
  `workflow_call` trigger with a `publish` input, or its `test` job no longer
  runs `CT_SLOW=1 pnpm test`.
- You find yourself wanting to edit `docker.yml` to make this work.
- Anything would require pushing a tag or starting the Release workflow to
  "test" the change. Do not do either.

## Maintenance notes

- **The first proof is the next release.** Whoever cuts it should watch the run:
  `browser` must finish green before `publish` starts. If the run fails at
  start-up with a message that a nested job "is requesting 'packages: write',
  but is only allowed 'packages: none'", the `permissions` block on the
  `browser` job is missing or wrong.
- A red browser suite now blocks a release, including on arm64 (the image smoke
  test there). That is intended; a flaky golden frame will be felt at release
  time, so fix flakiness rather than re-running.
- Deferred on purpose: skipping the second test run in the `image` job. It needs
  a new input on `docker.yml` and an `if:` with `always()` on its `publish` job,
  which is easy to get subtly wrong and cannot be tested without a release.
- Not covered here, recorded as separate findings in `plans/README.md`: pinning
  third-party actions by commit SHA, splitting verify from publish so only the
  publish step holds the OIDC token, and removing the `NPM_TOKEN` fallback.
