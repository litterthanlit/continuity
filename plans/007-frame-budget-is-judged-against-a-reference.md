# Plan 007: The frame budget is judged against a reference workload, not a stopwatch

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat aefaee4..HEAD -- tests/browser.slow.test.ts docs/decisions/0011-moving-backgrounds.md .github/workflows/docker.yml`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live files before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1 (it can block a release since plan 002 merged)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 006 (merged)
- **Category**: tests
- **Planned at**: commit `aefaee4`, 2026-11-18

## Why this matters

"fits the frame budget" fails a gradient-field frame that costs more than 25 ms
of wall-clock time. Plan 006 gave it a quiet machine in CI, and it still fails
now and then, because GitHub's runners differ in speed. Run alone, the last ten
Docker runs measured 12.3–21.5 ms on nine runners, 28.9 / 30.5 / 21.1 ms on a
tenth, and 25.7 / 25.9 / 26.2 ms on the one that failed. Three near-identical
readings mean a slower machine, not a slower shader.

A fixed millisecond limit cannot tell those apart. This plan keeps the budget
(25 ms on the machine it was set on) and changes how it is enforced: the test
times a fixed reference shader in the same page, next to each field
measurement, and judges the field as a multiple of it. A slower machine slows
both, so the ratio holds; a costlier field shader raises it.

Measured before writing this plan, with the exact code below:

| Machine | Field | Reference | Ratio |
|---|---|---|---|
| 4 cores, quiet (three runs) | 10.8–13.0 ms | 13.3–17.6 ms | 0.78, 0.88, 0.78 |
| limited to 2 cores | 19.7–23.6 ms | 25.9–29.0 ms | 0.77 |
| limited to 1 core | 37.2–39.1 ms | 51.4–56.8 ms | 0.72 |

The limit this plan sets is 25 / 15.5 = 1.61. The first version of the field
shader, which decision 0011 rejected at 29–36 ms a frame, would have measured
about 1.9–2.3 and still fail.

## Current state

- `tests/browser.slow.test.ts` — the browser suite (needs `CT_SLOW=1` and a
  headless Chrome). The test is the last one in the
  `gradient fields (projects/_backgrounds)` block.
- `docs/decisions/0011-moving-backgrounds.md` — §5 records the budget.
- `.github/workflows/docker.yml` — runs the suite with `CT_BUDGET=0`, then this
  test by name. **Not modified by this plan.**

The test today (`tests/browser.slow.test.ts`, lines 510–537 at `aefaee4`):

```ts
  // A wall-clock measurement: alone the field costs 13-16 ms a frame, but beside the rest of the
  // suite on the same 4 cores it has measured 25-37 ms. CI therefore runs the suite with
  // CT_BUDGET=0 (this test skipped) and then this test by itself, by name (docker.yml): keep the
  // name and that command in step. The budget itself does not move (docs/decisions/0011 §5).
  it.skipIf(process.env.CT_BUDGET === "0")("fits the frame budget", { retry: 2 }, async () => {
    const got = await inBackgrounds<{ medianGradient: number; medianSolid: number }>(`(function () {
      ${FIELD_HELPERS}
      var a = sc("a");
      function median(xs) { xs.sort(function (p, q) { return p - q; }); return xs[xs.length >> 1]; }
      function run(offset) {
        var ms = [];
        for (var i = 0; i < 30; i++) {
          var s = performance.now();
          ct.seek(a.start + offset + (i * (a.duration - 0.1)) / 30);
          sync();
          ms.push(performance.now() - s);
        }
        return median(ms);
      }
      run(0.05);
      var medianGradient = run(0);
      document.querySelectorAll("canvas[data-ct-gradient]").forEach(function (c) { c.remove(); });
      var medianSolid = run(0.01);
      return { medianGradient: medianGradient, medianSolid: medianSolid };
    })()`);
    console.log(`gradient field: ${got.medianGradient.toFixed(1)} ms/frame median, ${got.medianSolid.toFixed(1)} ms without it`);
    expect(got.medianGradient - got.medianSolid).toBeLessThanOrEqual(25);
  });
});
```

The helpers it uses, defined earlier in the same file as the string
`FIELD_HELPERS` (do not change them): `ct`, `tl`, `sc(id)` (a scene of the
timeline), `field(id)` (a scene's `canvas[data-ct-gradient]`), `centre(id)` and
`sync()` (forces each field canvas to finish drawing with a one-pixel
`readPixels`). `inBackgrounds<T>(script)` builds `projects/_backgrounds`, opens
it in a browser and evaluates `script` in the page.

`docs/decisions/0011-moving-backgrounds.md`, the first two rows of the table in
§5 (lines 88–89):

```markdown
| in-page cost per frame, ct's browser (Vulkan SwiftShader), median of 30 seeks, three runs | 12.6, 15.3, 15.7 ms (budget 25 ms) |
| the same, during the full slow suite (HyperFrames rendering on the same 4 cores) | 25.7 ms once; the test retries for an uncontended run |
```

Conventions: TypeScript, 2-space indent, double quotes, semicolons. Code that
runs in the page is written as ES5-style strings (`var`, `function`), like the
rest of this file. Comments are rare, full sentences, and say why.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile` | exit 0 |
| Is a browser available | `node bin/ct.mjs doctor` | a `✔ chrome` line |
| The test alone | `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"` | `1 passed \| 21 skipped` |
| The same on one core | `CT_SLOW=1 taskset -c 0 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"` | `1 passed \| 21 skipped` |
| Everything browserless | `pnpm verify` | exit 0, same counts as before |

## Scope

**In scope** (the only files you should modify):
- `tests/browser.slow.test.ts` (this one test, plus two constants and one helper string directly above its `d(` block)
- `docs/decisions/0011-moving-backgrounds.md` (two table rows in §5)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):
- `src/runtime/gradient.ts`, `src/runtime/gradient-shader.ts` — the field itself.
- `.github/workflows/docker.yml` — it keeps running this test by name, alone.
- The test's name, its `it.skipIf(process.env.CT_BUDGET === "0")` and `{ retry: 2 }`.
- `FIELD_HELPERS` and every other test.
- The numbers `25` and `15.5`. Do not tune them to make a run pass.

## Git workflow

- Branch: `advisor/007-frame-budget-is-judged-against-a-reference` (or the branch your operator gave you).
- One commit. Message style is a plain sentence with an area prefix.
  Suggested: `Tests: the frame budget is judged against a reference shader`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the budget constants and the reference shader

In `tests/browser.slow.test.ts`, insert this block directly above the line
`d("gradient fields (projects/_backgrounds)", () => {`:

```ts
/** The frame budget (docs/decisions/0011 §5), and what the reference shader costs on the machine it was set on. */
const FRAME_BUDGET_MS = 25;
const REFERENCE_MS = 15.5;

/**
 * A fixed workload the size of a field: 32 sin/cos pairs a pixel, drawn and read back like a field
 * frame. SwiftShader pays for both per pixel on the CPU, so their ratio holds from one machine to
 * the next where milliseconds do not.
 */
const REFERENCE_SHADER = `
  function reference(like) {
    var c = document.createElement("canvas"); c.width = like.width; c.height = like.height;
    var g = c.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
    function sh(type, src) {
      var s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error("reference shader: " + g.getShaderInfoLog(s));
      return s;
    }
    var p = g.createProgram();
    g.attachShader(p, sh(g.VERTEX_SHADER, "#version 300 es\\nvoid main() { vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0); }"));
    g.attachShader(p, sh(g.FRAGMENT_SHADER, "#version 300 es\\nprecision highp float; uniform float u_t; out vec4 o; void main() { vec2 q = gl_FragCoord.xy * 0.01; float a = 0.0; for (int i = 0; i < 32; i++) { float k = float(i + 1); a += sin(q.x * k + u_t) * cos(q.y * k - u_t); } o = vec4(vec3(a / 64.0 + 0.5), 1.0); }"));
    g.linkProgram(p); g.useProgram(p); g.viewport(0, 0, c.width, c.height);
    var uT = g.getUniformLocation(p, "u_t"), n = 0;
    return function () {
      g.uniform1f(uT, ++n * 0.1); g.drawArrays(g.TRIANGLES, 0, 3);
      g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
    };
  }
`;
```

Note the `\\n` after `#version 300 es`: the TypeScript template literal must
produce the two characters `\n` inside the page's JavaScript string, which then
becomes a real newline in the GLSL source. A single backslash would break the
page script.

**Verify**: `pnpm typecheck` → exit 0. (`pnpm lint` reports the three new
names as unused until Step 2; that is expected at this point.)

### Step 2: Judge the field against the reference

Replace the whole test shown in "Current state" — from the comment line
`// A wall-clock measurement: …` through the test's closing `});`, leaving the
final `});` that closes the `d(` block — with:

```ts
  // The budget is 25 ms a frame on the machine it was set on. CI runners differ in speed by more
  // than the budget's headroom (alone, 12-30 ms), so the field is judged against a reference shader
  // timed beside it in the same page: a slower machine slows both. CI still runs this test by
  // itself, by name, after the suite (docker.yml): keep the name and that command in step.
  it.skipIf(process.env.CT_BUDGET === "0")("fits the frame budget", { retry: 2 }, async () => {
    const got = await inBackgrounds<{ gradient: number[]; reference: number[]; solid: number }>(`(function () {
      ${FIELD_HELPERS}
      ${REFERENCE_SHADER}
      var a = sc("a"), drawReference = reference(field("a"));
      function median(xs) { xs = xs.slice().sort(function (p, q) { return p - q; }); return xs[xs.length >> 1]; }
      function timed(frame) {
        var ms = [];
        for (var i = 0; i < 30; i++) { var s = performance.now(); frame(i); ms.push(performance.now() - s); }
        return median(ms);
      }
      function seeks(offset) {
        return timed(function (i) { ct.seek(a.start + offset + (i * (a.duration - 0.1)) / 30); sync(); });
      }
      seeks(0.05);
      timed(drawReference);
      // Three pairs, each field run next to its own reference run, so a busy moment hits both.
      var gradient = [], reference = [];
      for (var r = 0; r < 3; r++) { gradient.push(seeks(r * 0.003)); reference.push(timed(drawReference)); }
      document.querySelectorAll("canvas[data-ct-gradient]").forEach(function (c) { c.remove(); });
      return { gradient: gradient, reference: reference, solid: seeks(0.01) };
    })()`);
    const ratios = got.gradient.map((g, i) => (g - got.solid) / got.reference[i]).sort((p, q) => p - q);
    const ms = (xs: number[]) => xs.map((x) => x.toFixed(1)).join(", ");
    console.log(`gradient field: ${ms(got.gradient)} ms/frame, ${got.solid.toFixed(1)} ms without it; reference ${ms(got.reference)} ms; ${ratios[1].toFixed(2)}x the reference (budget ${(FRAME_BUDGET_MS / REFERENCE_MS).toFixed(2)}x)`);
    expect(ratios[1]).toBeLessThanOrEqual(FRAME_BUDGET_MS / REFERENCE_MS);
  });
```

`ratios[1]` is the median of the three pairs.

**Verify** (needs a browser; run `node bin/ct.mjs doctor` first):

- `pnpm typecheck` → exit 0, and `pnpm lint` → exit 0.
- `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"`
  → `Tests  1 passed | 21 skipped (22)`.
- `CT_SLOW=1 taskset -c 0 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"`
  → `Tests  1 passed | 21 skipped (22)`. On one core the field costs about
  three times as much in milliseconds, which the old test would have failed;
  this one must pass.
- `CT_SLOW=1 CT_BUDGET=0 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"`
  → `Tests  22 skipped (22)`.

### Step 3: Prove the test can still fail

A test that cannot fail guards nothing. Temporarily change
`const REFERENCE_MS = 15.5;` to `const REFERENCE_MS = 60;` (a limit of about
0.42× the reference, below the field's real ratio) and run:

`CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "fits the frame budget"`

**Verify**: `1 failed`, with an `AssertionError: expected 0.… to be less than or
equal to 0.41…`. Then restore `const REFERENCE_MS = 15.5;` and confirm with
`grep -c "const REFERENCE_MS = 15.5;" tests/browser.slow.test.ts` → `1`.

### Step 4: Record how the budget is enforced

In `docs/decisions/0011-moving-backgrounds.md`, replace the two table rows
shown in "Current state" (lines 88–89) with these three:

```markdown
| in-page cost per frame, ct's browser (Vulkan SwiftShader), median of 30 seeks, three runs | 12.6, 15.3, 15.7 ms (budget 25 ms) |
| the same, during the full slow suite (HyperFrames rendering on the same 4 cores) | 25.7 ms once; CI now runs the test by itself, after the suite |
| the same, alone, across GitHub's runners | 12.3–30.5 ms: they differ in speed by more than the budget's headroom. The test therefore times a fixed reference shader beside each field run (15.5 ms on the machine above) and fails above 25 / 15.5 = 1.61× it. The field measures 0.72–0.88× on one, two and four cores; the first shader (29–36 ms) would have measured about 2× |
```

**Verify**: `grep -c "1.61×" docs/decisions/0011-moving-backgrounds.md` → `1`,
and `grep -c "the test retries for an uncontended run" docs/decisions/0011-moving-backgrounds.md` → `0`.

### Step 5: Full verification

**Verify**: `pnpm verify` → exit 0 with the same counts as before this plan,
and `git status --short` lists only the two in-scope files.

## Test plan

No new test: an existing test changes what it asserts. The evidence is:

- it passes on this machine at full speed and limited to one core (Step 2);
- it fails when the limit is set below the field's real ratio (Step 3);
- on the pull request, the Docker workflow's `test (amd64)` log shows a line
  `gradient field: … x the reference (budget 1.61x)` and the job passes.

## Done criteria

- [ ] The three vitest runs in Step 2 give the stated results
- [ ] Step 3 showed a failure with `REFERENCE_MS = 60`, and the value is back to `15.5`
- [ ] `grep -c "toBeLessThanOrEqual(FRAME_BUDGET_MS / REFERENCE_MS)" tests/browser.slow.test.ts` → `1`
- [ ] `grep -c 'fits the frame budget' tests/browser.slow.test.ts` → `1` and `grep -c "retry: 2" tests/browser.slow.test.ts` → `1`
- [ ] `git diff --stat aefaee4..HEAD -- .github/workflows/docker.yml src/` prints nothing
- [ ] `pnpm verify` exits 0
- [ ] `git status --short` lists only `tests/browser.slow.test.ts`, `docs/decisions/0011-moving-backgrounds.md` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live files.
- There is no headless Chrome. This plan cannot be verified without one; do
  not commit an unverified version.
- The page throws `reference shader: …` (the GLSL did not compile). Report the
  message; do not rewrite the shader.
- In Step 2 the test fails at full speed or on one core. Report the printed
  `gradient field: …` line. Do not change `25`, `15.5`, the loop count or the
  retries.
- `taskset` is not available. Skip only the one-core run and say so plainly.
- In Step 3 the test still passes with `REFERENCE_MS = 60`.

## Maintenance notes

- `REFERENCE_MS` is a calibration, not a tolerance. Change it only by measuring
  the reference shader on the machine decision 0011's numbers came from, and
  record the new value in 0011 §5 in the same change.
- The reference shader must stay fixed. Editing it silently moves the budget.
- If the field shader gets cheaper or dearer on purpose, the printed ratio is
  the number to quote in 0011.
- The ratio assumes both shaders run on SwiftShader on the CPU. On a machine
  with a real GPU the two may not scale together; the test is only run in
  ct's headless browser.
- If this still fails in CI, read the printed line first: a ratio near 0.8 with
  a failure means the assertion is wrong; a ratio above 1.61 means the field
  really got dearer relative to the machine.
