---
description: Set this repo up for Continuity — install the ct CLI (@litterthanlit/continuity), scaffold config, and check the toolchain (Node 22+, headless Chrome, ffmpeg).
argument-hint: "[npm|pnpm|yarn|bun]"
---

Set up Continuity in this repository. Be brief; only stop to ask if something is
genuinely ambiguous (e.g. a monorepo with several packages — ask which one makes videos).

1. **Package manager.** Use `$ARGUMENTS` if given; otherwise detect from the lockfile
   (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, else npm).
   No `package.json`? Create a minimal private one (`{"name": "<dir>", "private": true}`).
2. **Install** the CLI as a dev dependency, exact version:
   - npm `npm i -D -E @litterthanlit/continuity` · pnpm `pnpm add -D -E @litterthanlit/continuity`
   - yarn `yarn add -D -E @litterthanlit/continuity` · bun `bun add -d --exact @litterthanlit/continuity`
3. **Scaffold:** `npx ct init`. It writes `continuity.json`, `projects/` (ES-module scope +
   editor tsconfig), a managed `.gitignore` block, a managed Continuity section in
   `CLAUDE.md`, and allows `Bash(npx ct:*)` in `.claude/settings.json`. Safe to re-run.
4. **Toolchain:** read the `npx ct doctor` output that `init` prints.
   - No headless Chrome → `npx playwright install chromium-headless-shell` (or set
     `CT_BROWSER_PATH` to any Chrome/Chromium ≥ 120).
   - No ffmpeg → install it with the OS package manager (`brew install ffmpeg`,
     `apt-get install ffmpeg`, …).
   Re-run `npx ct doctor` until it says `ready.`
5. **Smoke test:** `npx ct new hello --aspect 9:16` → `npx ct check hello` (0 errors) →
   `npx ct render hello --draft`. Then delete `projects/hello` unless the user wants it.
6. Tell the user what was installed and changed, and that `/continuity:make-video <brief>`
   now makes a full video.
