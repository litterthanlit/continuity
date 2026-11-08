import { scene, Headline, Safe, Stage } from "continuity";
import { HANDOFF_TOP, HandoffPane, SampleCaption } from "../lib/index.js";

/**
 * The handoff, part one: one explicit command saves the note in Claude Code. The handoff block
 * (lib/layout.ts), as resume's: the one-line headline at HANDOFF_TOP, the Claude pane in its slot
 * a region under it (PANE: safe 0, top 432; the block centred on the frame's centre line),
 * the command box at CMD inside it, the output line under it, and the honesty caption
 * bottom-left — the same pixels resume uses, so the match only has to move the command.
 *
 * Into the cut the command box travels +SAVE_TRAVEL right (stage 144 → 504) on t²: resume-cmd
 * waits 536 px further along (Codex slot) — 0.56 · v·d at v 1200 px/s, d 0.8 s, inside the reach
 * window (lib/layout.ts PANE).
 */
const SAVE_TRAVEL = 360;
const INTO_CUT = 0.6;

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
          out={text["save-out"]}
        />
        <SampleCaption ct="caption">{text.caption}</SampleCaption>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // JOIN IN (carry up, layered, from writeback): the headline arrives with the wave, no entrance
    // of its own; the pane's entrance travels the carry's way (up) on frame 0.
    m.enter("save-term", "rise", { at: 0 });
    // The honesty line, quietly, once the pane is in.
    m.enter("caption", "fade", { at: 0.4 });
    // b1: the command box appears and the command types (12 chars at 20 cps → ~1.15).
    m.enter("save-cmd", "fade", { at: "b1" });
    m.type("save-cmd-text", { at: "b1", cps: 20 });
    // b2: saved — the scene's one expressive moment.
    m.enter("save-out", "rise", { at: "b2", ease: "expressive" });
    // JOIN OUT (match v2 → resume-cmd): t² into the cut, fastest on the last frame (≈ 1200 px/s),
    // so the match carries the command across to Codex. Nothing else moves; the caption is paired.
    m.tween(
      "save-cmd",
      { x: [0, SAVE_TRAVEL] },
      { at: `end-${INTO_CUT}`, duration: INTO_CUT, ease: { type: "bezier", p: [1 / 3, 0, 2 / 3, 1 / 3] } },
    );
  },
});
