# Brief — littmd

- **Product / subject:** litt.md — Nick's design language and taste for web and product UI,
  packaged as a Claude Code plugin. Taste is written as rules with a Check line (the P# profile,
  v0.16), every value lives in one `tokens.css`, the components install from a shadcn registry
  (`npx shadcn add @litt/button`, namespaced `--litt-*` so they never restyle the host), and an
  agent test grades what Claude builds with litt's own checks (skill loaded, registry used, host
  lint, typecheck, build, screenshots). The gallery is live at littmd.vercel.app.
- **Audience:** design engineers and people building with Claude Code who are tired of every
  agent-built page looking the same.
- **The one thing they should remember:** litt.md turns a person's taste into something an agent
  can build with — and be checked against.
- **Call to action:** open the gallery — littmd.vercel.app.
- **Format:** 16:9 · 1920×1080 · 30fps · ~32s · silent-first.
- **Tone & references:** Linear / Vercel / Raycast launch films, in litt itself: technical
  precision, lit from above. Calm, exact, airy. The product's own artefacts as the UI.
- **Look:** `litt-dark`, type kit `litt`, litt's cobalt (no `theme.ts`: this *is* litt). The light
  falls on the reveal and the end card only. One primary fill in the film: the end card's button.
  The registry scene shows a primary button too, as the installed component (its own frame).
- **Must-say:**
  1. Agents build in everyone's taste, not yours.
  2. litt.md: your taste, written as rules (each with a check).
  3. One file holds every value; both themes designed.
  4. Install the components from the registry, don't copy them.
  5. Claude builds with it, and litt's own checks grade it.
  6. Motion in three tiers, one expressive moment per view.
  7. litt.md · Technical precision, lit from above · littmd.vercel.app

## Assumptions (director)

- No VO or music; cuts sit on visual beats (no `bpm`).
- UI mock data is real: the rule names and IDs come from `taste/profile.md`, the token lines from
  `tokens.css`, the agent-test checks from `evals/agents/README.md`, the motion numbers from the
  fixed decisions. Hex values never appear (they live only in tokens.css, and in scene code they
  would fail `litt-hex`), so the token sample shows weights, radii and springs.
- The tokens shown are the web values (4px, 8px), as written in the file, even though the video's
  chrome is litt at 2×.
- Emphasis is by ink only. The hook rhymes with the reveal: "yours." keeps fg, then "Your taste".
