import type { ComponentChildren } from "preact";
import { Stage, Safe, Label, Headline, Body } from "continuity";

/**
 * The chapter scenes (reveal, tokens, registry, agents, motion) share one lockup on the
 * safe left edge: Label 8px above the display line, the display line 32px above
 * its summary (Body, in the grey). Solid canvas, except the reveal (`bg="lit"`):
 * the light is kept for the reveal and the end card. Ids: `label`, `headline`, `sub`.
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
  bg = "solid",
  height,
  children,
}: {
  label: string;
  headline: string;
  sub: string;
  layout?: "split" | "stacked";
  bg?: "solid" | "lit";
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
    <Stage bg={bg}>
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
