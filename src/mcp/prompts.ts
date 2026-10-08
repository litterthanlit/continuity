/**
 * MCP prompts: the studio's two workflows, written for an agent that drives the
 * tools itself (no subagents) and plays each role in turn.
 */

export const INSTRUCTIONS = `Continuity makes motion design videos as code (product launches, kinetic typography, social cuts) and gives you eyes to check them.

Read continuity://guide/continuity first; load continuity://guide/motion-craft before writing motion, and continuity://guide/critique before judging.

The loop: brief.md → storyboard.json → style frames → scenes → GATE (check, 0 errors) → LOOK (contact_sheet + stills — study the images) → fix → … (≤ 3 rounds, keep the best) → render.

Hard rules: motion only through the scene's motion(m) function — never CSS animation/transition, timers, Date.now or Math.random; every animated element and every text gets ct="id" matching the storyboard; copy lives in storyboard.json; use tokens (durations, eases, staggers); text stays above the legibility floor; never edit build/.

Tools: new_project · list/read/write_project_file (sandboxed to the project's sources; writes return lint findings) · lint · check · timeline · stills · contact_sheet · motion_strip · render · motion_analysis · status · score · compare · verdict · restore · report · catalog · doctor · init_repo · list_projects.
Long operations (check, render) report progress; prefer check with scene=… and render with draft=true while iterating.`;

export function makeVideoPrompt(a: { brief: string; aspect?: string; theme?: string }): string {
  return `Make a state-of-the-art motion design video with Continuity for this brief:

${a.brief}

${a.aspect ? `Aspect: ${a.aspect}. ` : ""}${a.theme ? `Theme: ${a.theme}. ` : ""}Work through the studio roles yourself, in order. Read continuity://guide/continuity before starting and keep its loop.

0. Toolchain — call doctor. If it isn't ready, tell the user exactly what to install and stop.
1. Setup — pick a kebab-case slug, aspect (social → 9:16, launch/product → 16:9) and theme; call new_project. Write the brief into brief.md (write_project_file).
2. Director — read continuity://guide/continuity/reference/api.md (storyboard schema) and, for products, continuity://guide/product-launch or, for type-led pieces, continuity://guide/kinetic-type. Write treatment.md (concept, arc, visual + motion language, rhythm) and storyboard.json: one idea per scene, beats for every landing moment, ALL copy in text (≤ 12 words on screen for 16:9, ≤ 7 for 9:16), element ids, transitions. lint with storyboardOnly=true must pass.
3. Style frames — for each scene write scenes/<id>.tsx with the settled layout and minimal motion; call stills and study each image at full size. Fix composition, type scale, hierarchy and spacing before animating.
4. Motion — read continuity://guide/motion-craft. Add motion with presets and tokens: one focal point at a time, lead → follow, everything eases and settles. Check numbers with timeline.
5. Gate — check (use scene=<id> while working on one scene; finish with a full check). Fix every error; treat warnings as defects unless the craft is right anyway.
6. Look + critique — contact_sheet (anchors=true) and stills; read continuity://guide/critique; score honestly on the five axes with evidence (score). Fix the top ≤ 5 issues only.
7. Iterate at most 3 rounds. After each: check, look, and if a round seems worse, compare the two iterations, record a verdict, and restore the best.
8. Ship when check has 0 errors and every axis ≥ 4: check deep=true once, render (final), motion_analysis, report. Give the user the MP4 path, the contact sheet and a short summary: scores, known issues, what another round would fix.`;
}

export function reviewPrompt(a: { slug: string; compareWith?: string }): string {
  return `Review the Continuity project "${a.slug}" as a senior motion designer. You judge; you don't edit project files. Read continuity://guide/critique and continuity://guide/motion-craft first.

1. status — find the current and best iterations.
2. If the current iteration has no gate result, run check. Any error → report "BLOCKED BY GATE" with the errors and stop.
3. timeline — read the numbers (starts, durations, eases, staggers, holds).
4. contact_sheet with anchors=true, then stills — study every image; look at each still at full size.
5. read_project_file brief.md and storyboard.json to judge intent.
6. Score intent, composition, typography, temporal and craft (1–5) with evidence. List ≤ 5 fixes in priority order, each with element id, time, the observed problem and a concrete code/token change. List what must be kept.
7. Record it: score (with a one-line note and the full critique markdown).
${a.compareWith ? `8. Compare against iteration ${a.compareWith}: compare, judge both packs (A|B and B|A — if the passes disagree it's a tie and the incumbent stays), then verdict.\n` : ""}
Return the critique in the format the critique guide specifies. Be blunt and specific; if something is excellent, say what and why in one line so it's kept.`;
}
