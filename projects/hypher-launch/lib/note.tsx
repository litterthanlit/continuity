import type { ComponentChildren } from "preact";
import { El, cx } from "continuity";
import { TwoInk } from "./ink.js";
import { CARD, CARD_FOOT, CARD_PAD, NOTE_TOP, ROW_H, UI } from "./layout.js";

/**
 * Hypher's note, drawn like the site's illustration: a raised white card (litt's Card:
 * surface-1, the hairline + top highlight, radius 16, 48 inset), a header with the note's
 * title and its id on a mono chip at the right, then rows under 2px hairlines — a label in the
 * grey (30, UI.meta) in a 192 px column, the value in fg (36, UI.value): litt's video UI at
 * ×1.25 (layout.ts UI). A decision row can carry what it replaces (a second line 8 under the
 * value: "Replaces" and the old value, both grey) and the "Pinned" mark (under its label).
 *
 * Every row's ct id is passed in (`rows[i].ct`), so scenes animate them by storyboard id.
 * The note card's size is fixed (864 × 384, CARD: it hugs a header and two rows), so an empty
 * card (frame 0 of the note scene, and its quiet still in capture's tile) is exactly the card
 * the rows later fill. The writeback card's height follows its content (`wbHeight`).
 */
export interface NoteRowSpec {
  ct?: string;
  /** "Goal", "Constraint", "Decision", "Next" (NOTE_LABELS). Leave out for a full-width line in two inks ("Next: …"). */
  label?: string;
  value: string;
  /** The value's own id (wb-change), so it can mask in on its own line. */
  valueCt?: string;
  /**
   * What a decision replaces: a second line, 8 under the value — "Replaces" in the label column,
   * the old value beside it, both in the grey at the meta step (30/40, baselines shared).
   */
  replaces?: string;
  /** The old value's id (wb-replaces). It is a block with its origin top-left, so a scene can
   * lift it onto the value line at ×1.2 (30/40 → 36/48: the value step exactly) and drop it back. */
  replacesCt?: string;
  /** The "Replaces" label's id. */
  replacesLabelCt?: string;
  /** The sage "Pinned" mark under the row's label, 8 below it (a human approved the decision): `${ct}-pin`. */
  pinned?: boolean;
}

export const NOTE_LABELS = { goal: "Goal", constraint: "Constraint", decision: "Decision", next: "Next", changed: "Changed", replaces: "Replaces" } as const;

/** The note's id (token-gate) on a neutral chip: Geist Mono, the grey, surface-2 with a hairline. */
export function IdChip({ ct, children }: { ct?: string; children: ComponentChildren }) {
  return (
    <El ct={ct} as="span" class={cx("inline-flex items-center rounded-control bg-surface-2 px-[16px] font-mono text-fg-muted shadow-hairline", UI.meta)}
      style={`height:${UI.chip}px`}>
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
    <El ct={ct} as="span" class={cx("inline-flex shrink-0 items-center rounded-control bg-accent-tint px-[16px] font-sans font-label text-accent-fg", UI.meta)}
      style={`height:${UI.chip}px`}>
      {children}
    </El>
  );
}

export function NoteRow({ row }: { row: NoteRowSpec }) {
  if (row.replaces !== undefined) {
    // A decision with its history: the value line, then 8 under it the line it replaces.
    return (
      <El ct={row.ct} class="flex flex-col gap-[8px] border-t-2 border-line py-[32px]">
        <div class="flex items-start gap-[32px]">
          <span class={cx("w-[192px] shrink-0 pt-[6px] font-sans text-fg-muted", UI.meta)}>{row.label}</span>
          <El as="span" ct={row.valueCt} class={cx("block min-w-0 flex-1 font-sans text-fg", UI.value)}>
            {row.value}
          </El>
        </div>
        <div class="flex items-start gap-[32px]">
          <El as="span" ct={row.replacesLabelCt} class={cx("block w-[192px] shrink-0 font-sans text-fg-muted", UI.meta)}>
            {NOTE_LABELS.replaces}
          </El>
          <El as="span" ct={row.replacesCt} class={cx("block min-w-0 origin-top-left font-sans text-fg-muted", UI.meta)}>
            {row.replaces}
          </El>
        </div>
      </El>
    );
  }
  return (
    <El ct={row.ct} class="flex items-start gap-[32px] border-t-2 border-line py-[32px]">
      {row.label !== undefined ? (
        <>
          <div class="flex w-[192px] shrink-0 flex-col items-start gap-[8px]">
            {/* 6 down: the label's baseline on the value's (30/40 beside 36/48). */}
            <span class={cx("pt-[6px] font-sans text-fg-muted", UI.meta)}>{row.label}</span>
            {row.pinned && <Pinned ct={row.ct ? `${row.ct}-pin` : undefined} />}
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-[8px]">
            <El as="span" ct={row.valueCt} class={cx("font-sans text-fg", UI.value)}>
              {row.value}
            </El>
          </div>
        </>
      ) : (
        <span class={cx("font-sans", UI.value)}>
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
  /** Place it in the right column, centred on the frame's centre line (CARD, NOTE_TOP; absolute, inside <Safe>). `false`: the scene places it. */
  slot?: boolean;
  class?: string;
}) {
  return (
    <El
      ct={ct}
      data-ct-ui
      class={cx("flex flex-col rounded-surface bg-surface-1 p-[48px] shadow-raised", slot ? "absolute" : "relative", cls)}
      style={`width:${width}px;height:${height}px${slot ? `;left:${CARD.left}px;top:${NOTE_TOP}px` : ""}`}
    >
      <div class="flex items-center justify-between pb-[32px]">
        <span class={cx("font-sans font-title text-fg", UI.value)}>{title || ""}</span>
        <IdChip ct={idCt}>{noteId}</IdChip>
      </div>
      {rows.map((r) => (
        <NoteRow row={r} />
      ))}
    </El>
  );
}

/**
 * The writeback card: who wrote back (text["wb-head"], the title weight, 36, fg), an optional mono
 * meta line under it (8 below: a lockup), then rows as in the note — a decision row with
 * what it replaces, or a full-width line in two inks ("Next: …": the lead in the grey, the action
 * in fg). Slotted, it takes the note card's place: the same right column and the same top
 * (NOTE_TOP), so the note → writeback carry hands one card place to the next and the two headlines
 * share a line; it hugs its content (`wbHeight`, up to the 8 grid), so it is never half blank.
 */
export function wbHeight(rows: NoteRowSpec[], meta = false): number {
  const row = (r: NoteRowSpec) => ROW_H + (r.replaces ? 8 + 40 : 0);
  return CARD_PAD + 48 + (meta ? 8 + 40 : 0) + 32 + rows.reduce((h, r) => h + row(r), 0) + CARD_FOOT;
}

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
  /** text["wb-head"]: who wrote back ("Claude Code"). */
  head: string;
  metaCt?: string;
  meta?: string;
  rows?: NoteRowSpec[];
  width?: number;
  height?: number;
  /** Place it where the note card sits (CARD.left, NOTE_TOP; absolute, inside <Safe>). `false`: the scene places it. */
  slot?: boolean;
  class?: string;
}) {
  const h = height ?? Math.ceil(wbHeight(rows, !!meta) / 8) * 8;
  return (
    <El
      ct={ct}
      data-ct-ui
      class={cx("flex flex-col rounded-surface bg-surface-1 p-[48px] shadow-raised", slot ? "absolute" : "relative", cls)}
      style={`width:${width}px;padding-bottom:${CARD_FOOT}px${h ? `;height:${h}px` : ""}${slot ? `;left:${CARD.left}px;top:${NOTE_TOP}px` : ""}`}
    >
      <div class="flex flex-col gap-[8px] pb-[32px]">
        <El as="p" ct={headCt} class={cx("font-sans font-title text-fg", UI.value)}>
          {head}
        </El>
        {meta && (
          <El as="p" ct={metaCt} class={cx("font-mono text-fg-muted", UI.meta)}>
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
