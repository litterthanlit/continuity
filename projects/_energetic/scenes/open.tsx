import { scene, Stage } from "continuity";
import { TerminalFrame } from "../lib/terminal.js";

// The machine speaks first: the card snaps in on the steep ease, then the question and its
// answer type on at a constant rate — linear, because typing is a process, not a move.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <TerminalFrame label={text.label} lines={['$ ct search "archive"', "412 prints · 6 cities"]} />
    </Stage>
  ),
  motion: (m) => {
    m.tween("term", { y: [96, 0], opacity: [0, 1] }, { at: "b1", duration: "snap", ease: "steep", kind: "enter" });
    m.enter("label", "wipeRight", { at: "b1+0.1", duration: "snap", ease: "steep" });
    m.type("sh-l0", { at: "b1+0.35", cps: 30 });
    m.type("sh-l1", { at: "after:sh-l0+0.15", cps: 48 });
    m.camera({ scale: [1, 1.04] }, { origin: { x: 54, y: 540 } });
  },
});
