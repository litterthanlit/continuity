---
description: Score a Continuity project on the 5-axis rubric from real evidence and return a prioritized fix list.
argument-hint: <project-slug>
---

Critique the Continuity project `$ARGUMENTS`.

Spawn the `critic` subagent with the slug (it is read-only and records scores
with `pnpm ct score`). When it returns, relay to the user: the five scores, the
top fixes (element id, time, problem, concrete change), and what to keep. Do not
apply fixes unless the user asks — suggest `/iterate $ARGUMENTS` instead.
