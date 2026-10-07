import type { ComponentChildren } from "preact";
import { Safe } from "continuity";

/**
 * The piece's one layout: a left-aligned editorial type stack, optically
 * centered (a touch above center) in the 9:16 social safe zone. Every scene uses it, so lines
 * land on the same left edge and baseline rhythm from cut to cut.
 */
export function TypeStack({ children, below }: { children: ComponentChildren; below?: ComponentChildren }) {
  return (
    <Safe zone="social">
      <div class="absolute inset-0 flex flex-col justify-center gap-[72px] pb-[4%]">
        <div class="flex flex-col">{children}</div>
        {below}
      </div>
    </Safe>
  );
}
