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
  layout?: "split" | "stacked";
  /** Height of the product surface, px. */
  height: number;
  children: ComponentChildren;
}) {
  const lockup = (
    <div class="flex flex-col" style={layout === "split" ? { width: `${SPLIT.copy}px` } : undefined}>
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
    <div class="relative shrink-0" style={{ width: `${layout === "split" ? SPLIT.width : STACKED.width}px`, height: `${height}px` }}>
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
 * The carries between chapters (docs/decisions/0010): the cut lands on movement, so both
 * sides move the way the camera travels (left).
 *
 * Out — the lockup leaves first, travelling left, just before the carry picks the scene up
 * (the carry's lead starts 0.2s before the end): copy, then the camera.
 */
export function leaveLeft(m: MotionBuilder) {
  m.tween(["label", "headline", "sub"], { x: [0, -24], opacity: [1, 0] }, { at: "end-0.5", duration: "exit", ease: "out", stagger: "list", kind: "exit" });
}

/**
 * In — the carry lands the scene still travelling left; `lead` (the product) arrives along
 * the travel with a lag (it travels further than the camera, so it reads as nearer), the
 * label slides in the same way, and the headline waits for the carry to land.
 */
export function arriveLeft(m: MotionBuilder, lead: string[], opts: { lag?: number } = {}) {
  const lag = opts.lag ?? 48;
  m.tween(lead, { x: [lag, 0] }, { at: 0, duration: "slow", ease: "out", stagger: "list", kind: "enter" });
  m.enter("label", "slideLeft", { at: 0.15 });
}
