import type { ComponentChildren } from "preact";
import { Safe, type MotionBuilder, type SceneContext } from "continuity";

/**
 * Where the statement's first line sits, from the top of the social safe zone
 * (which starts at 12% = 230px). 290 puts it at y≈520 of 1920: the upper-middle
 * band, high enough that the eyes scene's contact sheet still fits below it.
 */
export const TOP = 290;

/**
 * The piece's one layout: a left-aligned stack of display lines on one fixed
 * top edge in the 9:16 social safe zone. Every left-aligned scene uses it, so
 * lines land on the same left edge and the same first baseline from cut to cut
 * — kinetic type that lives on hard cuts. `below` sits one region (64px) under
 * the statement.
 */
export function TypeStack({ children, below }: { children: ComponentChildren; below?: ComponentChildren }) {
  return (
    <Safe zone="social">
      <div class="absolute inset-x-0 flex flex-col" style={`top:${TOP}px`}>
        <div class="flex flex-col">{children}</div>
        {below && <div class="mt-[64px]">{below}</div>}
      </div>
    </Safe>
  );
}

/** Display line height (the 9:16 display step is 112 / 112). */
const LINE = 112;
/** Ambient push: litt's ceiling. */
const PUSH = 0.03;

/**
 * litt's one ambient life — the camera's slow 3% push — held on the statement's
 * left edge and vertical middle (the camera's `origin`) instead of the frame
 * centre, so the left edge stays still from cut to cut.
 */
export function push(m: MotionBuilder, ctx: SceneContext, lines = 2) {
  const x = ctx.width * 0.08; // the social safe zone's left inset
  const y = ctx.height * 0.12 + TOP + (lines * LINE) / 2;
  m.camera({ scale: [1, 1 + PUSH] }, { origin: { x, y } });
}

/** The caret: litt's focus colour (as in Input), sized to the display step's cap height. */
export const CARET = "inline-block h-[88px] w-[8px] bg-focus";
