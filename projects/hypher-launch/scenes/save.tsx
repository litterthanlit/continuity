import { scene, Headline, Safe, Stage } from "continuity";
import { DRIFT, HANDOFF_TOP, HandoffPane, SampleCaption } from "../lib/index.js";

/**
 * The handoff, part one: one explicit command saves the note in Claude Code. The handoff block
 * (lib/layout.ts), as resume's: the one-line headline at HANDOFF_TOP, both panes in their slots a
 * region under it (PANE: Claude at safe 0, Codex at 896, top 432; the block centred on the frame's
 * centre line) — Claude Code with the command box at CMD and the output line under it, Codex CLI
 * idle (its header only: the pane resume shows, on the same pixels) — and the honesty caption
 * bottom-left. So the match only has to move the command between two panes that already exist.
 *
 * Into the cut the command box travels +SAVE_TRAVEL right (stage 144 → 504) on t²: resume-cmd
 * waits 536 px further along (Codex slot) — 0.56 · v·d at v 1200 px/s, d 0.8 s, inside the reach
 * window (lib/layout.ts PANE). As it leaves it uncovers the command's grey echo (save-echo, drawn
 * under the box), which resume's Claude pane keeps on the same pixel.
 */
const SAVE_TRAVEL = 360;
const INTO_CUT = 0.6;
/** The panes' translate-only arrival, up with the carry (litt's travel). */
const ARRIVE = 32;
/** The headline's left edge on the stage (Safe's inset 96, 54 + HANDOFF_TOP + half the line). */
const HEAD_ORIGIN = { x: 96, y: 54 + HANDOFF_TOP + 56 };

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline ct="headline" class="absolute left-0 whitespace-nowrap" style={`top:${HANDOFF_TOP}px`}>
          {text.headline}
        </Headline>
        <HandoffPane
          variant="claude"
          ct="save-term"
          cmdCt="save-cmd"
          outCt="save-out"
          cmd={text["save-cmd"]}
          echo={text["save-cmd"]}
          echoCt="save-echo"
          out={text["save-out"]}
        />
        <HandoffPane variant="codex" ct="codex-term" />
        <SampleCaption ct="caption">{text.caption}</SampleCaption>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // JOIN IN (carry up, layered, from writeback): the headline arrives with the wave, no entrance
    // of its own. Both panes are there at full opacity on frame 0 and travel up with the carry by
    // translate only (an opacity fade made the dark panes a grey ghost over the light page).
    m.tween(["save-term", "codex-term"], { y: [ARRIVE, 0] }, { at: 0 });
    // The honesty line, quietly, once the panes are in.
    m.enter("caption", "fade", { at: 0.4 });
    // b1: the command box appears and the command types (12 chars at 20 cps → ~1.15).
    m.enter("save-cmd", "fade", { at: "b1" });
    m.type("save-cmd-text", { at: "b1", cps: 20 });
    // b2: saved — the scene's one expressive moment.
    m.enter("save-out", "rise", { at: "b2", ease: "expressive" });
    // The hold's ambient life: the frame opens 2% (1.02 → 1, on the headline's left edge) and is
    // at rest on the identity when the command moves (go). A push would end 2% in, and the
    // match's hard cut would snap both panes back; this way they line up pixel for pixel.
    m.camera({ scale: [1.02, 1] }, { at: 0.3, duration: m.time("go") - 0.3, ease: DRIFT, origin: HEAD_ORIGIN });
    // JOIN OUT (match v2 → resume-cmd): t² into the cut, fastest on the last frame (≈ 1200 px/s),
    // so the match carries the command across to Codex. As it leaves it uncovers its grey echo,
    // laid under the box once the box is opaque (unseen until then; resume's Claude pane keeps it
    // on the same pixel). Nothing else moves; the caption is paired.
    m.enter("save-echo", "fade", { at: "after:save-cmd" });
    m.tween(
      "save-cmd",
      { x: [0, SAVE_TRAVEL] },
      { at: `end-${INTO_CUT}`, duration: INTO_CUT, ease: { type: "bezier", p: [1 / 3, 0, 2 / 3, 1 / 3] } },
    );
  },
});
