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
 * an entrance of its own, and resume-term (with the static Claude pane) is on screen from frame 0.
 *
 * JOIN OUT (portal out via trust's machine-screen, 1.0s from 3.0): everything is at rest from
 * ≈ 1.4 — no caret, no camera push — so the still on trust's screen is exact.
 */
export default scene({
  view: ({ text }) => <ResumeFrame text={text} />,
  motion: (m) => {
    // b1 (0.8): the match has landed; the statement lands — the scene's one expressive moment.
    m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    // b2 (0.95): Codex reads the next action (responsive), settled by ≈ 1.3.
    m.enter("resume-out", "rise", { at: "b2" });
  },
});
