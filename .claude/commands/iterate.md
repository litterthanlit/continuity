---
description: Run one disciplined improvement round on a Continuity project — apply notes, gate, look, compare against the best, keep the winner.
argument-hint: <project-slug> [notes…]
---

Run one improvement round on: $ARGUMENTS

(First word = project slug; the rest are the user's notes. With no notes, use the
latest critique in `pnpm ct status <slug>` / the critic.)

1. `pnpm ct status <slug>` — note the current and best iterations.
2. Apply the notes — only what they ask, one change per issue, preserving what
   the critique said to keep. Scene-local work can go to `scene-builder`
   subagents in parallel.
3. `pnpm ct check <slug>` → 0 errors.
4. Look: `pnpm ct sheet <slug>` and `pnpm ct stills <slug>`; read them.
5. Spawn the `critic` to score the new iteration.
6. `pnpm ct compare <slug> <best> <new>`; read both packs (A|B and B|A);
   `pnpm ct verdict <slug> <best> <new> --winner <n> --reason "…"`.
   If the new one lost or tied, `pnpm ct restore <slug> best` and tell the user
   why the change didn't land.
7. Summarize: what changed, scores before → after, the verdict, and the next
   most valuable fix.
