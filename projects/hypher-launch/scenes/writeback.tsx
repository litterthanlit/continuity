import { scene, Headline, Safe, Stage } from "continuity";
import { COPY_WIDTH, DRIFT, Lines, NOTE_LABELS, NOTE_TOP, WritebackCard, breakAfter, type NoteRowSpec } from "../lib/index.js";

/**
 * Step three: when an agent stops, it writes back why a decision changed. The note scene's
 * layout, held: the headline (columns A–C, two lines like "One note / per project.") on the
 * note's headline line (NOTE_TOP), beside the writeback card in the note card's place (CARD.left,
 * NOTE_TOP; it hugs its content), top-aligned — so the carry hands one note on to its next step,
 * not a new layout.
 * The card: who wrote back, then the Changed row (the decision fg, what it replaces in the grey).
 * The "Next" line is resume's: Codex reads it there.
 *
 * Joins. In: a layered carry left from `note` — headline (copy, 1.0) and wb-card (ui, 0.6, with
 * its title) are on screen from frame 0 and the wave's deceleration is their entrance. Out: a
 * layered carry up into `save` — the headline (row 1) leads the card (row 2) up and out.
 */
const rowsOf = (text: Record<string, string>): NoteRowSpec[] => [
  { ct: "wb-change", label: NOTE_LABELS.changed, value: text["wb-change"], replaces: text["wb-replaces"], replacesCt: "wb-replaces" },
];

// The headline's top-left corner on the stage: Safe's inset (96, 54) + (0, NOTE_TOP), as note's.
const HEAD_ORIGIN = { x: 96, y: 54 + NOTE_TOP };

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline ct="headline" class="absolute left-0" style={`top:${NOTE_TOP}px;width:${COPY_WIDTH}px`}>
          <Lines lines={breakAfter(text.headline, "Agents")} />
        </Headline>
        <WritebackCard ct="wb-card" headCt="wb-head" head={text["wb-head"]} rows={rowsOf(text)} />
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1: the decision the agent changed — the scene's one expressive moment.
    m.enter("wb-change", "rise", { at: "b1", ease: "expressive" });
    // b2: what it replaces, in the grey (lead → follow).
    m.enter("wb-replaces", "fade", { at: "b2" });
    // The hold's ambient life: a 3% push on the headline's left edge, into the carry (as note's).
    m.camera({ scale: [1, 1.03] }, { at: 0.3, duration: m.time("end") - 0.3, ease: DRIFT, origin: HEAD_ORIGIN });
  },
});
