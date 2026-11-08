import type { ComponentChildren } from "preact";
import { El, Headline, Safe, Stage, cx } from "continuity";
import { SampleCaption } from "./brand.js";
import { Lines } from "./ink.js";
import { COPY_WIDTH, HANDOFF_TOP, NOTE_TOP, breakAfter, copyOf } from "./layout.js";
import { NOTE_LABELS, NoteCard } from "./note.js";
import { HandoffPane } from "./terminal.js";

/**
 * Whole frames shared by a scene and a picture of it on another scene's tile or screen (the
 * portals). The scene renders the frame live (`quiet` off: Stage, ct ids = the storyboard's);
 * the neighbour renders it `quiet` inside a <Still>: the same components, no ct ids, a plain
 * canvas instead of the Stage (no grain), and only what that scene shows at the handoff moment.
 */
const Frame = ({ quiet, children }: { quiet?: boolean; children: ComponentChildren }) =>
  quiet ? <div class="absolute inset-0 overflow-hidden bg-canvas text-fg font-sans">{children}</div> : <Stage bg="solid">{children}</Stage>;

/**
 * The note scene: "One note / per project." on the left (headline, columns A–C), the note card
 * in the right column, top-aligned with it, the pair centred on the frame's centre line
 * (NOTE_TOP; note-card, note-id; rows row-constraint and row-decision). `quiet` draws its frame 0 — the empty card and its token-gate header, nothing
 * else — for capture's note-tile. So the live scene must keep the headline and the rows unseen
 * at frame 0 (their entrances come after the portal lands) and the card at rest.
 */
export function NoteFrame({ text = copyOf("note"), quiet }: { text?: Record<string, string>; quiet?: boolean }) {
  const ct = (id: string) => (quiet ? undefined : id);
  return (
    <Frame quiet={quiet}>
      <Safe>
        {!quiet && (
          <Headline ct="headline" class="absolute left-0" style={`top:${NOTE_TOP}px;width:${COPY_WIDTH}px`}>
            <Lines lines={breakAfter(text.headline, "note")} />
          </Headline>
        )}
        <NoteCard
          ct={ct("note-card")}
          idCt={ct("note-id")}
          noteId={text["note-id"]}
          rows={
            quiet
              ? []
              : [
                  { ct: "row-constraint", label: NOTE_LABELS.constraint, value: text["row-constraint"] },
                  { ct: "row-decision", label: NOTE_LABELS.decision, value: text["row-decision"] },
                ]
          }
        />
      </Safe>
    </Frame>
  );
}

/**
 * The resume scene, settled: "Resume in Codex." (headline, HANDOFF_TOP: the block of statement
 * and pane row centred on the frame's centre line), both handoff panes in their slots —
 * Claude Code on the left as save left it (its output line, and the command's grey echo where
 * the box left it — it crossed to Codex; no ct ids, it never moves) and Codex CLI on the right (resume-term, resume-cmd,
 * resume-out; under the box, save's idle prompt and its caret, held solid: the box lands on them) — and the caption. `quiet` draws its last frame for trust's machine-screen.
 */
export function ResumeFrame({ text = copyOf("resume"), quiet }: { text?: Record<string, string>; quiet?: boolean }) {
  const ct = (id: string) => (quiet ? undefined : id);
  const save = copyOf("save");
  return (
    <Frame quiet={quiet}>
      <Safe>
        <Headline ct={ct("headline")} class="absolute left-0 whitespace-nowrap" style={`top:${HANDOFF_TOP}px`}>
          {text.headline}
        </Headline>
        <HandoffPane variant="claude" echo={save["save-cmd"]} out={save["save-out"]} />
        <HandoffPane
          variant="codex"
          ct={ct("resume-term")}
          cmdCt={ct("resume-cmd")}
          outCt={ct("resume-out")}
          cmd={text["resume-cmd"]}
          out={text["resume-out"]}
          prompt={save["codex-prompt"]}
        />
        <SampleCaption ct={ct("caption")}>{text.caption}</SampleCaption>
      </Safe>
    </Frame>
  );
}

/**
 * A 16:9 picture of a 1920×1080 frame at `width` (576 → 0.3, capture's tile; 640 → ⅓, trust's
 * screen). `ct` is the portal's `via` (note-tile, machine-screen). The raised edge is drawn over
 * the picture (so it never covers it); radius 16 (`rounded-surface`), clipped. Place it with
 * `class`.
 */
export function Still({ ct, width, edge = true, class: cls, children }: { ct?: string; width: number; edge?: boolean; class?: string; children: ComponentChildren }) {
  const k = width / 1920;
  return (
    <El ct={ct} data-ct-ui class={cx("relative overflow-hidden rounded-surface bg-canvas", cls)} style={`width:${width}px;height:${(width * 9) / 16}px`}>
      <div class="absolute top-0 left-0 h-[1080px] w-[1920px] origin-top-left" style={`transform:scale(${k})`}>
        {children}
      </div>
      {edge && <div class="pointer-events-none absolute inset-0 z-10 rounded-surface shadow-raised" data-layout-ignore />}
    </El>
  );
}

/** Capture's note-tile: the note scene's frame 0 at 576 × 324. */
export function NoteStill({ ct = "note-tile", width = 576, class: cls }: { ct?: string; width?: number; class?: string }) {
  return (
    <Still ct={ct} width={width} class={cls}>
      <NoteFrame quiet />
    </Still>
  );
}

/** Trust's machine-screen: the resume scene's last frame at 640 × 360 (⅓). */
export function ResumeStill({ ct = "machine-screen", width = 640, edge = true, class: cls }: { ct?: string; width?: number; edge?: boolean; class?: string }) {
  return (
    <Still ct={ct} width={width} edge={edge} class={cls}>
      <ResumeFrame quiet />
    </Still>
  );
}
