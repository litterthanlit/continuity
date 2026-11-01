import type { MotionBuilder, SceneContext } from "continuity";

/** The piece's one left edge (inside the title-safe 5%) and its push, held on that edge. */
export const LEFT = 192;

/** The camera's slow push, energetic but unnoticed: 4% over the bar, held on the left edge. */
export function push(m: MotionBuilder, ctx: SceneContext, y = ctx.height / 2) {
  m.camera({ scale: [1, 1.04] }, { origin: { x: LEFT, y } });
}
