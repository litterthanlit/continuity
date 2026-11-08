import { scene } from "continuity";
import { HEAD_TOP, NoteFrame } from "../lib/index.js";

/**
 * Step two: one bounded note per project. The view is the shared NoteFrame — the headline on the
 * film's top line (columns A–C), the note card in the right column from the same line — so the
 * live scene is exactly what capture's note-tile shows (<NoteFrame quiet/>) until the portal lands.
 *
 *   frame 0 → land (0.9)  the empty card and its token-gate header, at rest; nothing else on screen
 *   b1 (0.95)             the rows rise into the card (the typed capture returns as the constraint)
 *   b2 (1.2)              the headline lands, maskUp lines — the one expressive moment
 *   land → end            the camera's 2% push, held on the headline's left edge
 *   out                   the layered carry left: headline (column A) leads, the card follows
 */

// The headline's top-left corner on the stage: Safe's inset (96, 54) + (0, HEAD_TOP).
const HEAD_ORIGIN = { x: 96, y: 54 + HEAD_TOP };

export default scene({
  view: ({ text }) => <NoteFrame text={text} />,
  motion: (m) => {
    // b1: the note fills, constraint then decision (list stagger, responsive).
    m.enter(["row-constraint", "row-decision"], "rise", { at: "b1", stagger: "list" });
    // b2: the statement — the scene's one expressive moment.
    m.enter("headline", "maskUp", { at: "b2", split: "lines", ease: "expressive" });
    // Ambient life from land only (the portal is the move until then): a 2% push held on the
    // headline's left edge, running into the carry so the scene is still moving at the cut.
    m.camera({ scale: [1, 1.02] }, { at: "land", duration: m.time("end") - m.time("land"), ease: "inOut", origin: HEAD_ORIGIN });
  },
});
