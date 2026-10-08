# 0004 — Docker images: a pinned toolchain, and ct on top

**Status:** accepted · 2026-10-08

## Context

Continuity's output depends on more than its own code: the Chrome build rasterises every
frame, ffmpeg encodes the render and system fonts cover glyph fallback. 0002 left users
to install Chrome and ffmpeg themselves, so two machines could render the same project
differently. CI never ran the browser suite at all (no Chrome on the runner).

## Decisions

### 1. Two targets in one Dockerfile
- **`toolchain`**: Node 22 (Debian bookworm), pinned `chrome-headless-shell`, ffmpeg, git,
  corepack. No `ct`. For CI in repos that install `@litterthanlit/continuity` themselves:
  they keep their pinned version and get our pinned browser.
- **`ct`** (default): `toolchain` + the package from this checkout, `ENTRYPOINT ["ct"]`,
  repo mounted at `/work`. For people without a local toolchain, render boxes and MCP
  clients (`docker run -i … mcp`).

One package on GHCR, Docker-style tag suffixes: `X.Y.Z` / `X.Y` / `latest` and
`X.Y.Z-toolchain` / `X.Y-toolchain` / `toolchain`.

### 2. Chrome is pinned through Playwright
`npx playwright@1.56.1 install --with-deps --only-shell chromium` gives
`chromium_headless_shell-1194` (Chromium 141.0.7390.37), the build `tests/golden` was made
with, plus its system libraries and a fallback font set (Noto color emoji, CJK), on both
amd64 and arm64. Chrome for Testing (HyperFrames' own download) has no linux-arm64 build.
`resolveBrowser()` already finds it via `PLAYWRIGHT_BROWSERS_PATH`. A Chrome bump is a
deliberate change: bump `PLAYWRIGHT_VERSION` and refresh the goldens in the same commit.

### 3. ct is installed from the lockfile, not from npm
`pnpm install --prod --frozen-lockfile` in `/opt/continuity`, then the package's own files.
The image is the commit it was built from (CI can build it on any branch), and transitive
dependencies are the locked ones, not whatever npm resolves on release day.

### 4. Runs as uid 1000 with `HOME=/tmp`
Outputs land in the host repo owned by the first Linux user instead of root; other uids pass
`--user "$(id -u):$(id -g)"`, and `HOME=/tmp` keeps that working for any uid. git has
`safe.directory '*'` because mounted repos belong to someone else. The toolchain image stays
root, which is what GitHub Actions `container:` jobs expect.

### 5. Release pushes images from release.yml
`docker.yml` is reusable: on pushes and PRs it builds both targets on amd64 and arm64
(native runners), runs the browser suite (golden frames, seeded defects, MCP browser tools)
inside the amd64 toolchain image, and drives the `ct` image like a user
(`doctor → init → new → check → render --draft`). `release.yml` calls it with
`publish: true` after npm publishing — a tag trigger would miss manual releases, whose tags
are created with `GITHUB_TOKEN` and trigger no workflows.

## Consequences
- The browser suite now runs in CI, so golden-frame drift is caught on every push.
- The toolchain image is ~450 MB compressed (most of it Chrome's libraries and fonts).
- First publish: the GHCR package starts private; make it public once in the package
  settings.
- Goldens are only asserted on amd64; arm64 is gated on the user smoke test.
