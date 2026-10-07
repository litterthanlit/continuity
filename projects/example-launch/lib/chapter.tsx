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
        <div class="absolute inset-0 flex flex-col gap-[40px]">
          <div class="flex flex-col gap-[12px]">
            <div data-ct-row class="flex items-center gap-[14px]">
              <EyebrowWithDot label={eyebrow} />
            </div>
            <Headline ct="headline" size="h2" as="h2">
              {headline}
            </Headline>
            {sub && (
              <Subhead ct="sub" size="caption">
                {sub}
              </Subhead>
            )}
          </div>
          <div class="relative flex-1">{children}</div>
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
