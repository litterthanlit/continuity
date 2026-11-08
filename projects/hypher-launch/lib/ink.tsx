import { Fragment } from "preact";

/**
 * Storyboard copy in litt's two inks, without changing the copy:
 * - `strong` given: that phrase in the bright ink, the rest in the grey
 *   ("Saved ‹token-gate @ 3f2a91c›");
 * - otherwise the lead up to the first ": " in the grey, the rest bright
 *   ("Next: ‹run the stale-revision test.›").
 * `dim` / `bright` are the two ink classes (defaults: the page's grey and fg; on the dark
 * terminal pane `text-canvas/64` and `text-canvas`).
 */
export function TwoInk({ text, strong, dim = "text-fg-muted", bright = "text-fg" }: { text: string; strong?: string; dim?: string; bright?: string }) {
  let pre = "";
  let mid = text;
  let post = "";
  if (strong) {
    const i = text.indexOf(strong);
    if (i >= 0) {
      pre = text.slice(0, i);
      mid = strong;
      post = text.slice(i + strong.length);
    }
  } else {
    const c = text.indexOf(": ");
    if (c >= 0) {
      pre = text.slice(0, c + 2);
      mid = text.slice(c + 2);
    }
  }
  return (
    <>
      {pre && <span class={dim}>{pre}</span>}
      <span class={bright}>{mid}</span>
      {post && <span class={dim}>{post}</span>}
    </>
  );
}

/**
 * Display lines from `breakAfter(…)`, joined by a space and <br/> (so the copy's text stays intact
 * for read-time). `twoInk`: the site's signature headline — the first line in fg, the lines after
 * it in the grey ("Capture / the mess."); for the solid scenes only (the smoke keeps one ink).
 * The grey line is one inline span, so split: "lines" still finds it as one line.
 */
export function Lines({ lines, twoInk = false }: { lines: string[]; twoInk?: boolean }) {
  return (
    <>
      {lines.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {twoInk && i > 0 ? <span class="text-fg-muted">{l}</span> : l}
          {i < lines.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </>
  );
}
