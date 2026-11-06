import type { ComponentChildren } from "preact";
import type { MotionBuilder } from "continuity";
import { Stage, Safe, Label, Headline, Body } from "continuity";

/**
 * The four chapter scenes (plan, check, measure, critic) share one lockup on the
 * safe left edge: Label 8px above the display line, the display line 32px above
 * its summary (Body, in the grey). Solid canvas: the moving field (Stage bg="gradient") is
 * kept for the turn and the end card. Ids: `label`, `headline`, `sub`.
 *
 * - `split` (default) — litt's asymmetric frame: the lockup in a 608px column
 *   (columns 1–5), a 96px region of air, the product at 1024px wide (~53% of
 *   the frame) on the right, both vertically centred. The display line breaks
 *   into ≤ 2 lines by meaning.
 * - `mirror` — the split frame turned round: the product on the left, the lockup on the
 *   right. For critic, whose card is measure's chart window carried left across the frame
 *   (the match), so the copy fills the column the window left.
 * - `stacked` — for the one surface that needs the full width (check: a contact
 *   sheet beside a terminal): the lockup above, the product 96px below at the
 *   full title-safe width.
 */
export const SPLIT = { copy: 608, width: 1024 } as const;
export const STACKED = { width: 1728, height: 600 } as const;

export function Chapter({
  label,
  headline,
  sub,
  layout = "split",
  height,
  children,
}: {
  label: string;
  headline: string;
  sub: string;
  layout?: "split" | "mirror" | "stacked";
  /** Height of the product surface, px. */
  height: number;
  children: ComponentChildren;
}) {
  const lockup = (
    <div class="flex flex-col" style={layout === "stacked" ? undefined : { width: `${SPLIT.copy}px` }}>
      <Label ct="label">{label}</Label>
      <Headline ct="headline" as="h2" class="mt-[8px]">
        {headline}
      </Headline>
      <Body ct="sub" class="mt-[32px]">
        {sub}
      </Body>
    </div>
  );
  const surface = (
    <div class="relative shrink-0" style={{ width: `${layout === "stacked" ? STACKED.width : SPLIT.width}px`, height: `${height}px` }}>
      {children}
    </div>
  );
  return (
    <Stage>
      <Safe>
        {layout === "split" ? (
          <div class="absolute inset-0 flex items-center justify-between">
            {lockup}
            {surface}
          </div>
        ) : layout === "mirror" ? (
          <div class="absolute inset-0 flex items-center justify-between">
            {surface}
            {lockup}
          </div>
        ) : (
          <div class="absolute inset-0 flex flex-col justify-center gap-[96px]">
            {lockup}
            {surface}
          </div>
        )}
      </Safe>
    </Stage>
  );
}

/**
 * Out — the lockup leaves first, travelling left (an exit into the cut), so only the product
 * rides the join: check → measure's carry, measure → critic's match.
 */
export function leaveLeft(m: MotionBuilder) {
  m.tween(["label", "headline", "sub"], { x: [0, -24], opacity: [1, 0] }, { at: "end-0.5", duration: "exit", ease: "out", stagger: "list", kind: "exit" });
}

/**
 * t² into the cut (the carry's own lead-in): accelerating, at its fastest on the last frame, so
 * a match has a speed to hand over (motion-craft §8, match v2).
 */
export const INTO_CUT = { type: "bezier" as const, p: [1 / 3, 0, 2 / 3, 1 / 3] as [number, number, number, number] };
