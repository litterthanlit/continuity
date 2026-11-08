import { scene, Stage, Safe, Stack, Headline } from "continuity";
import { HEAD_TOP, Lines, Wordmark, breakAfter } from "../lib/index.js";

// The turn: the must-say promise on the site's black smoke, signed by the name.
// One ink (text-canvas) on the field; rank comes from size and weight alone. The statement
// and its signature are one block at the film's headline line (HEAD_TOP, left 0) where hook's
// statement sits, so the cut swaps one statement for the next in place; the wordmark 32px under it.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="accent">
      <Safe>
        <Stack gap={32} class="absolute left-0 max-w-[1200px]" style={`top:${HEAD_TOP}px`}>
          <Headline ct="headline" class="text-canvas">
            <Lines lines={breakAfter(text.headline, "your")} />
          </Headline>
          <Wordmark ct="wordmark" class="text-canvas">{text.wordmark}</Wordmark>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1 = frame 0: the cut from the hook lands on the statement rising (the one moment).
    // Lines lead → follow on the list stagger (40ms): the 48-character must-say line needs
    // ~3.16s of reading before the carry starts (3.4s), so it is legible as early as it can be.
    m.enter("headline", "maskUp", { at: "b1", split: "lines", stagger: "list", ease: "expressive" });
    // b2: the name signs it.
    m.enter("wordmark", "fade", { at: "b2" });
    // No camera push: the field moves by itself, and the carry out is a pure translate.
  },
});
