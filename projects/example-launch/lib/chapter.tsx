import type { ComponentChildren } from "preact";
import { Stage, Safe, Eyebrow, Headline, Subhead } from "continuity";

/**
 * Shared layout for the four chapter scenes (plan, check, measure, critic):
 * accent-dot eyebrow, h2 headline and a caption on ONE left edge, product UI
 * below. Same edges and rhythm on every chapter → the push transitions read as
 * one continuous surface.
 *
 * Ids (animate them in motion()): `eyebrow` (dot + label), `headline`, `sub`.
 * `children` render in the stage area under the copy (relative, full width).
 */
/**
 * One surface geometry for every chapter so the push transitions read as one
 * continuous product surface: full title-safe width, fixed height, and (because
 * the caption line is always reserved) the same top edge in every chapter.
 */
export const SURFACE = { width: 1728, height: 600 } as const;

export function Chapter({
  eyebrow,
  headline,
  sub,
  children,
}: {
  eyebrow: string;
  headline: string;
  sub?: string;
  children: ComponentChildren;
}) {
  return (
    <Stage bg="grid">
      <Safe>
        {/* Vertically centred as one block (copy + fixed-height surface): even
            margins top and bottom instead of a dead band under the surface. */}
        <div class="absolute inset-0 flex flex-col justify-center gap-[40px]">
          <div class="flex flex-col gap-[12px]">
            <div data-ct-row class="flex items-center gap-[14px]">
              <EyebrowWithDot label={eyebrow} />
            </div>
            <Headline ct="headline" size="h2" as="h2">
              {headline}
            </Headline>
            {sub ? (
              <Subhead ct="sub" size="caption">
                {sub}
              </Subhead>
            ) : (
              // reserve the caption line so the UI area starts at the same y in every chapter
              <div aria-hidden="true" class="text-caption">&nbsp;</div>
            )}
          </div>
          <div class="relative shrink-0" style={{ height: `${SURFACE.height}px` }}>
            {children}
          </div>
        </div>
      </Safe>
    </Stage>
  );
}

function EyebrowWithDot({ label }: { label: string }) {
  return (
    <Eyebrow ct="eyebrow" as="div" class="flex items-center gap-[14px]">
      <span class="h-[12px] w-[12px] rounded-full bg-accent" />
      {label}
    </Eyebrow>
  );
}
