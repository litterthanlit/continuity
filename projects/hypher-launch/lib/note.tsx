import type { ComponentChildren } from "preact";
import { El, cx } from "continuity";
import { TwoInk } from "./ink.js";
import { CARD } from "./layout.js";

/**
 * Hypher's note, drawn like the site's illustration: a raised white card (litt's Card:
 * surface-1, the hairline + top highlight, radius 16, 48 inset), a header with the note's
 * title and its id on a mono chip at the right, then rows under 2px hairlines — a label in the
 * grey (26, the meta size) in a 192 px column, the value in fg (28). A decision row can carry
 * what it replaces (grey, 8 under the value) and the "Pinned" mark (under its label).
 *
 * Every row's ct id is passed in (`rows[i].ct`), so scenes animate them by storyboard id.
 * The card's size is fixed (864 × 640 by default), so an empty card (frame 0 of the note
 * scene, and its quiet still in capture's tile) is exactly the card the rows later fill.
 */
export interface NoteRowSpec {
  ct?: string;
  /** "Goal", "Constraint", "Decision", "Next" (NOTE_LABELS). Leave out for a full-width line in two inks ("Next: …"). */
  label?: string;
  value: string;
  /** What a decision replaces, without quotes: draws `Replaces “…”` in the grey under the value. */
  replaces?: string;
  /** The sage "Pinned" mark under the row's label, 8 below it (a human approved the decision): `${ct}-pin`. */
  pinned?: boolean;
}

export const NOTE_LABELS = { goal: "Goal", constraint: "Constraint", decision: "Decision", next: "Next", changed: "Changed" } as const;

/** The note's id (token-gate) on a neutral chip: Geist Mono, the grey, surface-2 with a hairline. */
export function IdChip({ ct, children }: { ct?: string; children: ComponentChildren }) {
  return (
    <El ct={ct} as="span" class="inline-flex h-[48px] items-center rounded-control bg-surface-2 px-[16px] font-mono text-[26px] leading-[32px] text-fg-muted shadow-hairline">
      {children}
    </El>
  );
}

/**
 * "Pinned": the sage mark, accent-tint fill and accent-fg ink (the dark sage that reads on it) —
 * a status in a word on a tinted chip, never a dot, never the accent as text colour.
 */
export function Pinned({ ct, children = "Pinned" }: { ct?: string; children?: ComponentChildren }) {
  return (
    <El ct={ct} as="span" class="inline-flex h-[48px] shrink-0 items-center rounded-control bg-accent-tint px-[16px] font-sans text-[26px] leading-[32px] font-label text-accent-fg">
      {children}
    </El>
  );
}

export function NoteRow({ row }: { row: NoteRowSpec }) {
  return (
    <El ct={row.ct} class="flex items-start gap-[32px] border-t-2 border-line py-[32px]">
      {row.label !== undefined ? (
        <>
          <div class="flex w-[192px] shrink-0 flex-col items-start gap-[8px]">
            <span class="pt-[2px] font-sans text-[26px] leading-[36px] text-fg-muted">{row.label}</span>
            {row.pinned && <Pinned ct={row.ct ? `${row.ct}-pin` : undefined} />}
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-[8px]">
            <span class="font-sans text-[28px] leading-[40px] text-fg">{row.value}</span>
            {row.replaces && (
              <span class="font-sans text-[26px] leading-[36px] text-fg-muted">
                Replaces “{row.replaces}”
              </span>
            )}
          </div>
        </>
      ) : (
        <span class="font-sans text-[28px] leading-[40px]">
          <TwoInk text={row.value} />
        </span>
      )}
    </El>
  );
}

export function NoteCard({
  ct,
  idCt,
  noteId,
  title = "The note",
  rows = [],
  width = CARD.width,
  height = CARD.noteHeight,
  slot = true,
  class: cls,
}: {
  /** The card (note-card). */
  ct?: string;
  /** The id chip (note-id). */
  idCt?: string;
  /** text["note-id"]: "token-gate". */
  noteId: string;
  /** The header's title (UI chrome, as on the site); `false` for none. */
  title?: string | false;
  rows?: NoteRowSpec[];
  width?: number;
  height?: number;
  /** Place it in the right column on the top line (CARD; absolute, inside <Safe>). `false`: the scene places it. */
  slot?: boolean;
  class?: string;
}) {
  return (
    <El
      ct={ct}
      data-ct-ui
      class={cx("flex flex-col rounded-surface bg-surface-1 p-[48px] shadow-raised", slot ? "absolute" : "relative", cls)}
      style={`width:${width}px;height:${height}px${slot ? `;left:${CARD.left}px;top:${CARD.top}px` : ""}`}
    >
      <div class="flex items-center justify-between pb-[32px]">
        <span class="font-sans text-[28px] leading-[40px] font-title text-fg">{title || ""}</span>
        <IdChip ct={idCt}>{noteId}</IdChip>
      </div>
      {rows.map((r) => (
        <NoteRow row={r} />
      ))}
    </El>
  );
}

/**
 * The writeback card: "Claude Code wrote back" (the title weight, 28, fg), an optional mono
 * meta line under it (token-gate @ 3f2a91c, 8 below: a lockup), then rows as in the note — a
 * "Changed" decision row, or a full-width line in two inks ("Next: run the stale-revision test.":
 * the lead in the grey, the action in fg). Height follows the content unless `height` is set.
 */
export function WritebackCard({
  ct,
  headCt,
  head,
  metaCt,
  meta,
  rows = [],
  width = CARD.width,
  height,
  slot = true,
  class: cls,
}: {
  ct?: string;
  headCt?: string;
  /** text["wb-head"]: "Claude Code wrote back". */
  head: string;
  metaCt?: string;
  meta?: string;
  rows?: NoteRowSpec[];
  width?: number;
  height?: number;
  /** Place it in the right column on the top line (CARD; absolute, inside <Safe>). `false`: the scene places it. */
  slot?: boolean;
  class?: string;
}) {
  return (
    <El
      ct={ct}
      data-ct-ui
      class={cx("flex flex-col rounded-surface bg-surface-1 p-[48px] shadow-raised", slot ? "absolute" : "relative", cls)}
      style={`width:${width}px${height ? `;height:${height}px` : ""}${slot ? `;left:${CARD.left}px;top:${CARD.top}px` : ""}`}
    >
      <div class="flex flex-col gap-[8px] pb-[32px]">
        <El as="p" ct={headCt} class="font-sans text-[28px] leading-[40px] font-title text-fg">
          {head}
        </El>
        {meta && (
          <El as="p" ct={metaCt} class="font-mono text-[26px] leading-[32px] text-fg-muted">
            {meta}
          </El>
        )}
      </div>
      {rows.map((r) => (
        <NoteRow row={r} />
      ))}
    </El>
  );
}
