import { scene, Headline, Safe, Stage } from "continuity";
import { COPY_WIDTH, HEAD_TOP, Lines, WritebackCard, breakAfter } from "../lib/index.js";

/**
 * Step three: when an agent stops, it writes back what comes next. The note scene's layout,
 * held: the headline on the film's top line (HEAD_TOP, columns A–C, two lines like "One note /
 * per project."), the writeback card in the same right column from the same top line (CARD).
 *
 * Joins. In: a layered carry left from `note` — headline (copy, 1.0) and wb-card (ui, 0.6) are
 * on screen from frame 0 and the wave's deceleration is their entrance. Out: a layered carry up
 * into `save` — the headline (row 1) leads the card (row 2) up and out; no exit of our own.
 */
export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline ct="headline" class="absolute left-0" style={`top:${HEAD_TOP}px;width:${COPY_WIDTH}px`}>
          <Lines lines={breakAfter(text.headline, "Agents")} />
        </Headline>
        <WritebackCard
          ct="wb-card"
          headCt="wb-head"
          head={text["wb-head"]}
          rows={[{ ct: "wb-next", value: text["wb-next"] }]}
          // The last row's own 32 below + 16 = the card's 48 above its head: an even inset.
          class="pb-[16px]"
        />
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
