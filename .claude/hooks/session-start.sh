#!/bin/bash
# SessionStart (Claude Code cloud sessions): install dependencies so the ct CLI,
# tests and linters work immediately. Synchronous on purpose: the agent's first
# `npx ct …` must not race the install. (This repo's own setup; users of the
# plugin get plugin/hooks/session-start.mjs instead.)
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# HyperFrames pulls in full puppeteer; never download its Chrome — we use a local headless shell.
export PUPPETEER_SKIP_DOWNLOAD=1

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || npm install -g pnpm@10.28.0 >/dev/null
fi

# `pnpm install` (not --frozen-lockfile) so a cached container only fetches what changed.
pnpm install --prefer-offline --reporter=silent

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  # Idempotent: resumed sessions re-run this hook against the same env file.
  for v in PUPPETEER_SKIP_DOWNLOAD HYPERFRAMES_NO_TELEMETRY DO_NOT_TRACK HYPERFRAMES_NO_UPDATE_CHECK; do
    grep -qx "export $v=1" "$CLAUDE_ENV_FILE" 2>/dev/null || echo "export $v=1" >> "$CLAUDE_ENV_FILE"
  done
fi

# Report toolchain health (non-fatal: a missing browser is reported, not hidden).
pnpm -s ct doctor || echo "continuity: toolchain incomplete — see 'npx ct doctor'"
