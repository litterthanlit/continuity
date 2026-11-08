import { scene, Headline, Safe, Stage } from "continuity";
import { COPY_WIDTH, DRIFT, Lines, NOTE_LABELS, NOTE_TOP, PUSH_X, WritebackCard, breakAfter, type NoteRowSpec } from "../lib/index.js";

/**
 * Step three: when an agent stops, it writes back why a decision changed. The note scene's
 * layout, held: the headline (columns A–C, two lines like "One note / per project.") on the
 * note's headline line (NOTE_TOP), beside the writeback card in the note card's place (CARD.left,
 * NOTE_TOP; it hugs its content), top-aligned — so the carry hands one note on to its next step,
 * not a new layout.
 * The card: who wrote back, then the note's Decision row — arriving as the note left it ("Keep the
 * session cookie.", fg, on the value line) and changing on screen: the old value drops a line into
 * "Replaces" and steps to the grey, and the new decision masks down into its place. Final frame:
 *   Decision   Hash tokens at rest.
 *   Replaces   Keep the session cookie.
 *
 * Joins. In: a layered carry left from `note` — headline (copy, 1.0) and wb-card (ui, 0.6, with
 * its title and the old decision) are on screen from frame 0 and the wave's deceleration is their
 * entrance. Out: a layered carry up into `save` — the headline (row 1) leads the card (row 2) up and out.
 */
const rowsOf = (text: Record<string, string>): NoteRowSpec[] => [
  {
    ct: "wb-row",
    label: NOTE_LABELS.decision,
    value: text["wb-change"],
    valueCt: "wb-change",
    replaces: text["wb-replaces"],
    replacesCt: "wb-replaces",
    replacesLabelCt: "wb-replaces-label",
  },
];

// The push's fixed point, as note's: the frame's centre across (PUSH_X), the headline's top line
// down. 2% (was 3% on the headline's left edge, which took the card to 1874, past action-safe):
// from the centre the card grows to ≈ 1809 and the headline drifts ≤ 17 px, as in capture and note.
const PUSH_ORIGIN = { x: PUSH_X, y: 54 + NOTE_TOP };

// The old value's lift onto the value line: one line (48) and the 8 between the lines up, at
// ×1.2 from its top-left — its 30/40 line becomes the value's 36/48 exactly (UI.meta → UI.value).
const VALUE_LINE = { y: -(48 + 8), scale: 36 / 30 };

// The change, after the carry has settled (it decelerates over ~0.5 s) and the old decision has
// been read in place for ~0.4 s: a second beat inside the scene, not a pile-up on the arrival.
const CHANGE = 0.9;

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline ct="headline" class="absolute left-0" style={`top:${NOTE_TOP}px;width:${COPY_WIDTH}px`}>
          <Lines twoInk lines={breakAfter(text.headline, "Agents")} />
        </Headline>
        <WritebackCard ct="wb-card" headCt="wb-head" head={text["wb-head"]} rows={rowsOf(text)} />
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // Frame 0: the note's decision, as the note left it — lifted onto the value line in fg; the
    // new value and the "Replaces" label are unseen until the change.
    // The change leads with the old value: it drops a line into its history and steps to the grey
    // (the whole stack moves down one line, so nothing crosses)…
    m.tween("wb-replaces", { y: [VALUE_LINE.y, 0], scale: [VALUE_LINE.scale, 1] }, { at: CHANGE });
    m.emphasize("wb-replaces", "dim", { at: CHANGE });
    // …and the new decision follows it down into the value line: the scene's one expressive moment.
    m.tween("wb-change", { yPct: [-110, 0] }, { at: CHANGE + 0.04, kind: "enter", split: "lines", mask: true, ease: "expressive" });
    // Its label follows (lead → follow, list step).
    m.enter("wb-replaces-label", "fade", { at: CHANGE + 0.12 });
    // The hold's ambient life: a 2% push from the frame centre, into the carry (as note's).
    m.camera({ scale: [1, 1.02] }, { at: 0.3, duration: m.time("end") - 0.3, ease: DRIFT, origin: PUSH_ORIGIN });
  },
});
