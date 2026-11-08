import { scene, Headline, Safe, Stage } from "continuity";
import { COPY_WIDTH, Lines, WritebackCard, breakAfter, wbTop, type NoteRowSpec } from "../lib/index.js";

/**
 * Step three: when an agent stops, it writes back what comes next. The note scene's layout,
 * held: the headline (columns A–C, two lines like "One note / per project.") beside the
 * writeback card in the same right column (CARD), top-aligned, the card hugging its content and
 * the pair centred on the frame's centre line (wbTop).
 *
 * Joins. In: a layered carry left from `note` — headline (copy, 1.0) and wb-card (ui, 0.6) are
 * on screen from frame 0 and the wave's deceleration is their entrance. Out: a layered carry up
 * into `save` — the headline (row 1) leads the card (row 2) up and out; no exit of our own.
 */
const rowsOf = (text: Record<string, string>): NoteRowSpec[] => [{ ct: "wb-next", value: text["wb-next"] }];

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline ct="headline" class="absolute left-0" style={`top:${wbTop(rowsOf(text))}px;width:${COPY_WIDTH}px`}>
          <Lines lines={breakAfter(text.headline, "Agents")} />
        </Headline>
        <WritebackCard ct="wb-card" headCt="wb-head" head={text["wb-head"]} rows={rowsOf(text)} />
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1: the card says who wrote back.
    m.enter("wb-head", "fade", { at: "b1" });
    // b2: what the agent hands on — the scene's one expressive moment.
    m.enter("wb-next", "rise", { at: "b2", ease: "expressive" });
  },
});
