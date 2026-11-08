import type { Style } from "continuity";
import { El, cx } from "continuity";
import { TwoInk } from "./ink.js";
import { CMD, PANE, UI } from "./layout.js";

/**
 * The handoff's terminal pane — the site's dark handoff panel, one per agent: a near-black
 * surface (`bg-device`) with the agent's name in the header, the command in Claude orange
 * (`text-data-amber`, theme.ts: colour that carries data, on these two commands only) inside a
 * fixed box, and one line of output in Geist Mono.
 *
 * Inks on the dark pane: `text-canvas` (bright) and `text-canvas/64` (the grey).
 *
 * The command box is the same 352×72 box in both variants, at the same place in the pane
 * (CMD: x 48, y 112), opaque (`bg-fg` on the `bg-device` pane: one surface step up), so the
 * storyboard's match (save-cmd → resume-cmd) hands over place, size, fill and corner exactly.
 * It is its own element: `cmdCt` on the box, `${cmdCt}-text` on the command inside it (type
 * that one; fade or move the box). The box has no entrance of its own unless the scene gives it
 * one, and nothing inside the pane clips it (no overflow-hidden), so it can travel.
 *
 * Type is litt's video UI at ×1.25 (layout.ts UI): mono 34/48 for the command and the output,
 * the header at the small step (30/40). The pane hugs its content (PANE.height 320).
 *
 * Place the pane in its PANE slot with `slot` (the default: Claude at x 0, Codex at x 896,
 * both at PANE.top), or with `slot={false}` and the scene's own class.
 */
export const PANE_TITLES = { claude: "Claude Code", codex: "Codex CLI" } as const;
export type Agent = keyof typeof PANE_TITLES;

export function CommandBox({ ct, cmd, class: cls, style }: { ct?: string; cmd: string; class?: string; style?: Style }) {
  return (
    <El
      ct={ct}
      data-ct-ui
      class={cx("flex items-center rounded-control bg-fg px-[24px] font-mono whitespace-nowrap", UI.mono, cls)}
      style={[`width:${CMD.width}px;height:${CMD.height}px`, typeof style === "string" ? style : ""].join(";")}
    >
      <El as="span" ct={ct ? `${ct}-text` : undefined} class="text-data-amber">
        {cmd}
      </El>
    </El>
  );
}

export function HandoffPane({
  variant,
  ct,
  cmdCt,
  outCt,
  cmd,
  out,
  strong,
  title,
  slot = true,
  width = PANE.width,
  height = PANE.height,
  class: cls,
}: {
  variant: Agent;
  /** The pane (save-term / resume-term). */
  ct?: string;
  /** The command box (save-cmd / resume-cmd); its text is `${cmdCt}-text`. */
  cmdCt?: string;
  /** The output line (save-out / resume-out). */
  outCt?: string;
  /** The command (text["save-cmd"]); leave out to draw the pane with the command gone. */
  cmd?: string;
  /** The output line (text["save-out"]); leave out for none. */
  out?: string;
  /** The phrase of `out` in the bright ink. Default: after "Lead: " ("Next: ‹…›"), or else after the first word ("Saved ‹token-gate @ 3f2a91c›"). */
  strong?: string;
  /** Header text; defaults to the agent's name. `false` draws the header bar empty. */
  title?: string | false;
  /** Place the pane in its PANE slot (absolute, inside <Safe>). `false`: the scene places it. */
  slot?: boolean;
  width?: number;
  height?: number;
  class?: string;
}) {
  const name = title === false ? undefined : (title ?? PANE_TITLES[variant]);
  const left = variant === "claude" ? PANE.claude : PANE.codex;
  return (
    <El
      ct={ct}
      data-ct-ui
      class={cx("rounded-surface bg-device shadow-lift", slot ? "absolute" : "relative", cls)}
      style={`width:${width}px;height:${height}px${slot ? `;left:${left}px;top:${PANE.top}px` : ""}`}
    >
      <div class="flex items-center border-b-2 border-canvas/8 px-[48px]" style={`height:${PANE.head}px`}>
        {name && <span class={cx("font-sans font-title text-canvas/64", UI.meta)}>{name}</span>}
      </div>
      {cmd !== undefined && <CommandBox ct={cmdCt} cmd={cmd} class="absolute" style={`left:${CMD.x}px;top:${CMD.y}px`} />}
      {out !== undefined && (
        <El
          as="p"
          ct={outCt}
          class={cx("absolute font-mono whitespace-nowrap", UI.mono)}
          style={`left:${PANE.pad}px;top:${CMD.y + CMD.height + 32}px`}
        >
          <TwoInk text={out} strong={strong ?? (out.includes(": ") ? undefined : out.slice(out.indexOf(" ") + 1))} dim="text-canvas/64" bright="text-canvas" />
        </El>
      )}
    </El>
  );
}
