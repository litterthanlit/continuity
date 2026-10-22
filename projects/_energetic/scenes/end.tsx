import { scene, Stage } from "continuity";
import { TerminalFrame } from "../lib/terminal.js";

// The loop closes: the depth move flies back out onto the opening frame, and the terminal
// types the handle. The caret blinks through the hold.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <TerminalFrame label={text.label} lines={["$ open continuity.dev"]} />
    </Stage>
  ),
  motion: (m) => {
    m.type("sh-l0", { at: "b1" });
    m.camera({ scale: [1.04, 1] }, { origin: { x: 54, y: 540 } });
  },
});
