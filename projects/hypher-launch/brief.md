# Brief

- **Product / subject:** Hypher (hypher.app) — project memory under your coding agents. It carries decisions and next steps between Claude Code and Codex: you capture the project as it is (rants, screenshots, chat exports, "don't widen OAuth"); Hypher keeps one bounded note per project (current goal, constraints, decisions with why and what they replace, done vs claimed, blockers, next action, sources, tree identity); when an agent stops it writes back why a decision changed and what comes next; the next agent — or the next session — starts from there. Save in Claude Code (`/hypher-save`), resume in Codex (`$hypher-resume`). It is not another place to write code, and it does not run or host agents.
- **Audience:** builders who switch between Claude Code and Codex on the same repository (the pilot cohort).
- **The one thing they should remember:** Stop re-explaining your project to every agent — the next agent starts from one note, not from zero.
- **Call to action:** Join the pilot — hypher.app
- **Format:** 16:9 · ~30s launch film, no music.
- **Tone & references:** calm, precise, honest (the site's voice: "A few honest answers", "Checked, not trusted"). Linear/Vercel launch lineage. Showcase Continuity's flow moves: a portal into the note, layered carries between steps, a physical match cut (e.g. `/hypher-save` in Claude Code → `$hypher-resume` in Codex), translate-only carries.
- **Brand constraints (colors, fonts, logo):** `theme.ts` carries the site's colours — near-white page #fdfcfc, text #2f2d2d with grey second lines (two inks), sage accent #88bba2 (status dots), Claude orange #D97757 (`data-amber`) only on the save/resume commands, Geist + Geist Mono. The hero and the end card sit on the site's black monochrome smoke (`<Stage bg="gradient" gradient="accent">`, type in `text-canvas` on it); product scenes on the light page colour. The wordmark is lowercase "hypher" set in Geist (no logo file).
- **Look:** litt-light with the brand theme; the moving field on the hero and the end card only.
- **Register:** calm.
- **Must-say copy:** "Stop re-explaining your project to every agent." · "Save in Claude Code. Resume in Codex." · "Your code never leaves your machine." · "Join the pilot" · hypher.app
- **Sample data (from the site; label it as such where the UI could be mistaken for a recording):** note `token-gate` · goal "Gate agent writes behind a hashed token." · constraint "Don't widen OAuth." · decision "Hash tokens at rest." replaces "Keep the session cookie" · next "Run the stale-revision test, then open the PR." · tree `acme/checkout · token-gate @ 3f2a91c`.
- **Honesty:** the site calls its UI "illustrations with sample data. Not a recording" — never imply a real recording or unshipped features (Baton is not shipped; no automatic checkpoints for Claude Code/Codex). What leaves the machine: decisions, constraints, branch and commit ids, file names and dirty state, the handoff. Never: source code, diffs, uncommitted edits, transcripts, secrets.

## Assumptions (director, 2026-11-07)

- **Length and sound:** 30.8 s, 9 scenes, no music, so durations are in seconds. Joins land on story beats, not on a bar grid.
- **The one line on the end card:** the brief's "one thing" is said twice. The hook says the pain ("Every agent starts from zero."). The end card answers it ("The next agent starts from one note."). The must-say "Stop re-explaining your project to every agent." is the turn, on the smoke, where the site sets it.
- **Word budget counts UI text too:** ≤ 12 words a frame, including terminal lines, card rows and the caption. So the UI shows one or two rows of the sample data per scene, never the whole note.
- **The illustration caption** ("Illustration · sample data") is on the scenes where the UI could pass for a recording: the first sample-data scene (capture, where text types) and the two terminal scenes (save, resume). The note and writeback cards are drawn as cards rather than screens, like the site's illustrations, so they don't carry it. The trust scene is a diagram.
- **Honesty:** save and resume are explicit commands the user runs (`/hypher-save`, `$hypher-resume`). Nothing in the film says the switch is automatic, says checkpoints happen by themselves, or names Baton. Trust shows only what leaves the machine (decisions, branch, commit). The headline says what never does.
- **Wordmark:** lowercase "hypher" in Geist 500 at the title step, set as type (no logo file). It appears on the turn, not on the end card, where the URL names the product.
- **CTA:** "Join the pilot" is the one primary button (the sage accent fill, `accent-fg` text) on the end card's black smoke. The URL "hypher.app" sits under it.
- **Colour:** sage is the accent's one job (the CTA fill, and focus or caret light). Claude orange (`data-amber`) is used only on the two command lines. Type on the smoke field is `text-canvas` (one ink). Product scenes sit on the #fdfcfc canvas.
