---
description: Review a Continuity project — score it on the 5-axis rubric from real evidence and return a prioritized fix list.
argument-hint: <project-slug>
---

Agent names: `director`, `scene-builder`, `critic` — when Continuity is installed as
a plugin they are namespaced (`continuity:director`, `continuity:scene-builder`,
`continuity:critic`); use whichever form your agent list shows.

Critique the Continuity project `$ARGUMENTS`.

Spawn the `critic` subagent with the slug (it is read-only and records scores
with `npx ct score`). When it returns, relay to the user: the five scores, the
top fixes (element id, time, problem, concrete change), and what to keep. Do not
apply fixes unless the user asks — suggest `/iterate $ARGUMENTS` instead.
