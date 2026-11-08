import { scene } from "continuity";
import { ResumeFrame } from "../lib/index.js";

/**
 * The handoff, part two: Codex resumes from the note. The view is the shared ResumeFrame (lib/
 * frames.tsx) — the same components trust draws `quiet` on its machine-screen — so this scene's
 * last frame and trust's first frame are one picture.
 *
 * JOIN IN (match from save, 0.8s): save-cmd → resume-cmd and caption → caption. The match carries
 * both: resume-cmd leaves the cut at save-cmd's ≈ 1200 px/s and slows into the Codex pane 536 px
 * along (lib/layout.ts PANE: inside the reach window); the caption stays on its pixel. Neither has
 * an entrance of its own. Both panes are the ones save ended on — resume-term is save's idle
 * codex-term (its waiting prompt and caret, held solid: the command lands on them), and the static
 * Claude pane keeps its output and the command's grey echo — so across the cut only the command
 * moves and the headline swaps.
 *
 * JOIN OUT (portal out via trust's machine-screen, 1.0s from 2.6): everything is at rest from
 * ≈ 1.5 — no caret, no camera push — so the still on trust's screen is exact.
 */
export default scene({
  view: ({ text }) => <ResumeFrame text={text} />,
  motion: (m) => {
    // b1 (0.1): the statement lands with the command as it crosses into Codex — the one expressive
    // moment — so the top of the frame is empty ≤ 4 frames through the match (at 0.15: 6).
    m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    // b2 (1.15): the command has landed (0.8) and runs; a beat later Codex prints the next action
    // (responsive), settled by ≈ 1.5 — then 1.1 s at rest before the portal (2.6).
    m.enter("resume-out", "rise", { at: "b2" });
  },
});
