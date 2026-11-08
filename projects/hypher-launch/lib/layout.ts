import storyboard from "../storyboard.json" with { type: "json" };

/**
 * The film's one layout system, in px inside <Safe> (title-safe: the stage inset 96 left/right,
 * 54 top/bottom in 1920×1080, so the safe area is 1728 × 972 and its centre line is y 486 =
 * stage 540). Continuity is the product: scenes take their numbers from here, never re-measure.
 *
 * The rule: every product frame is ONE block — its headline and its UI — and the block sits on
 * the frame's centre line (`centreTop(h)`), on the left edge. The block's height comes from its
 * content, and surfaces hug their content, so no scene is top-heavy and no card is half blank.
 *
 *   hook       headline, a region (96), the agent label + prompt       → HOOK_TOP
 *   capture    headline (2 lines), a region, the card ↔ tile row       → CAPTURE_TOP
 *   note       headline beside the note card, top-aligned, centred     → NOTE_TOP (CARD)
 *   writeback  the note's twin: the same headline line, the same card slot → NOTE_TOP (CARD)
 *   save       headline, a region, the pane row                        → HANDOFF_TOP, PANE.top
 *   resume     the same block as save (the match pairs them)
 *   turn       the statement on hook's headline line, so the cut swaps it in place → HOOK_TOP
 *   trust      its 796-high block centres at 88; it keeps HEAD_TOP (96), within a grid step
 *   end        the film's one centred frame (<Center>)
 *
 * UI is litt's video UI at ×1.25 (the display is 112; UI at 28 read 4:1 against it): values at
 * the body step (36/48), meta and labels at the small step (30/40), mono at 34/48 (UI below).
 */
export const SAFE = { width: 1728, height: 972 } as const;
/** The display step's line (Headline: 112/112). */
export const DISPLAY = 112;
/** Regions apart (typography: blocks 32, regions 96). */
export const REGION = 96;
/** The top of a block `h` high centred on the frame's centre line, on the 8 grid. */
export function centreTop(h: number): number {
  return Math.round((SAFE.height - h) / 16) * 8;
}

/** The film's old top line: trust keeps it (its 796-high block would centre at 88). */
export const HEAD_TOP = 96;
/** Columns A–C: a headline beside the right-hand card breaks into ≤ 2 lines inside this. */
export const COPY_WIDTH = 768;

/** Video UI at ×1.25, as Tailwind classes (sizes in px: value 36/48, meta 30/40, mono 34/48). */
export const UI = {
  value: "text-[36px] leading-[48px]",
  meta: "text-[30px] leading-[40px]",
  mono: "text-[34px] leading-[48px]",
  /** A chip's height (IdChip, Pinned) for meta-size text. */
  chip: 56,
} as const;

/** A card's inner spacing: 48 inset, 32 under the header, rows 32 above and below their text, a 2px rule. */
export const CARD_PAD = 48;
export const ROW_H = 2 + 32 + 48 + 32; // 114: one note row (rule, padding, a 48 line)
/** The card's last row ends 32 below its text; 16 more = the card's 48 above its header: an even inset. */
export const CARD_FOOT = 16;

/**
 * The card scenes' right column (x 864 → 1728, the safe right edge). The note card's height is
 * fixed (an empty card on note's frame 0 is exactly the card the rows later fill): header, two
 * rows, the foot — 48 + 56 + 32 + 2·114 + 16 = 380 → 384.
 */
export const CARD = { left: 864, width: 864, noteHeight: 384 } as const;
export const NOTE_TOP = centreTop(CARD.noteHeight); // 296 → stage 350–734

/** Hook: the statement, a region, the agent label (36) 16 over the prompt (104). */
export const PROMPT = { width: 1120, height: 104, labelGap: 16 } as const;
export const HOOK_TOP = centreTop(DISPLAY + REGION + 36 + PROMPT.labelGap + PROMPT.height); // 304

/** Capture: the two-line statement, a region, the card ↔ tile row (324) and the tile's label (8 + 40). */
export const CAPTURE_ROW_H = 324;
export const CAPTURE_TOP = centreTop(2 * DISPLAY + REGION + CAPTURE_ROW_H + 8 + 40); // 144

/**
 * The handoff's two terminal panes (save, resume): the one-line statement at HANDOFF_TOP, a
 * region, then the pane row — the block centred, so the panes sit just under the centre line.
 * Claude at 0, Codex at PANE.codex, 832 × PANE.height each, 64 apart. A pane hugs its content:
 * header 64, 48, the command box (72), 32, one output line (48), 56.
 *
 * The command box sits at the same place inside each pane (CMD), so save-cmd (Claude, safe x 48
 * → stage 144) and resume-cmd (Codex, safe x 944 → stage 1040) share a row: after save-cmd's
 * +360 move into the cut (stage 504), resume-cmd is 536 px along = 0.56 · v·d for v 1200 px/s,
 * d 0.8 s — inside the match's reach window (⅓–⅔), 0 across.
 */
const PANE_H = 320;
export const HANDOFF_TOP = centreTop(DISPLAY + REGION + PANE_H); // 224
export const PANE = { top: HANDOFF_TOP + DISPLAY + REGION, claude: 0, codex: 896, width: 832, height: PANE_H, head: 64, pad: 48 } as const;
/** The command box, relative to its pane: identical in both variants (the match pairs them). Fits "$hypher-resume" in mono 34. */
export const CMD = { x: 48, y: 112, width: 352, height: 72 } as const;

type Scene = { id: string; text?: Record<string, string> };

/** Another scene's storyboard copy (for a quiet still of that scene): copy lives in the storyboard. */
export function copyOf(sceneId: string): Record<string, string> {
  const s = (storyboard.scenes as unknown as Scene[]).find((x) => x.id === sceneId);
  if (!s?.text) throw new Error(`hypher-launch: no text for scene "${sceneId}" in storyboard.json`);
  return s.text;
}

/**
 * Split storyboard copy into display lines after the given words, without changing it:
 * `breakAfter("One note per project.", "note")` → ["One note", "per project."]. Render with
 * `<Lines lines={…} />` (or map with <br/>). Throws if a word is missing, so a copy edit that
 * breaks the line plan fails the build instead of setting a bad rag.
 */
export function breakAfter(text: string, ...words: string[]): string[] {
  const out: string[] = [];
  let rest = text;
  for (const w of words) {
    const i = rest.indexOf(`${w} `);
    if (i < 0) throw new Error(`breakAfter: "${w} " not in "${rest}"`);
    out.push(rest.slice(0, i + w.length));
    rest = rest.slice(i + w.length + 1);
  }
  out.push(rest);
  return out;
}
