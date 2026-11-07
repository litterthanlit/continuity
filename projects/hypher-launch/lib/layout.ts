import storyboard from "../storyboard.json" with { type: "json" };

/**
 * The film's one layout system, in px inside <Safe> (title-safe: the stage inset 96 left/right,
 * 54 top/bottom in 1920×1080). Every product scene (capture, note, writeback, save, resume) puts
 * its headline on the same top line and the same left edge; the card scenes share one right
 * column; the handoff scenes share two pane slots. Continuity is the product: never re-measure.
 *
 *   headline  left 0, top HEAD_TOP                 → stage (96, 150)
 *   card      left CARD.left, top HEAD_TOP, 864 w  → stage x 960 → 1824 (the safe right edge)
 *   panes     top PANE.top; Claude at 0, Codex at PANE.codex, 832 × PANE.height each, 64 apart
 *   caption   bottom-left on the safe edge (SampleCaption places itself)
 */
export const HEAD_TOP = 96;
/** Columns A–C: a headline beside the right-hand card breaks into ≤ 2 lines inside this. */
export const COPY_WIDTH = 768;
export const CARD = { left: 864, top: HEAD_TOP, width: 864, noteHeight: 640 } as const;
/**
 * The handoff's two terminal panes. The command box sits at the same place inside each pane
 * (CMD), so save-cmd (Claude, safe x 48 → stage 144) and resume-cmd (Codex, safe x 944 → stage
 * 1040) share a row: after save-cmd's +360 move into the cut (stage 504), resume-cmd is 536 px
 * along = 0.56 · v·d for v 1200 px/s, d 0.8 s — inside the match's reach window (⅓–⅔).
 */
export const PANE = { top: 304, claude: 0, codex: 896, width: 832, height: 416, head: 64, pad: 48 } as const;
/** The command box, relative to its pane: identical in both variants (the match pairs them). */
export const CMD = { x: 48, y: 112, width: 288, height: 56 } as const;

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
