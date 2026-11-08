import { scene, Stage, Safe, Stack, Headline } from "continuity";
import { DISPLAY, DRIFT, HOOK_TOP, Lines, Wordmark, breakAfter } from "../lib/index.js";

// The turn: the must-say promise on the site's black smoke, signed by the name.
// One ink (text-canvas) on the field; rank comes from size and weight alone. The statement and
// its signature are one block on the left edge, its second line on hook's headline line
// (HOOK_TOP: stage 358), so the cut swaps hook's statement for this one in place; the wordmark
// 32px under it. Why not the first line on hook's line: the field runs on global time, and on the
// turn its plume sits under the lower right of that band — "agent." would be on luma ~180 (≈ 2:1);
// one line higher the type keeps ≈ 3:1 or better at every frame.
const TOP = HOOK_TOP - DISPLAY;

// The push holds on the statement's left edge, between its two lines (stage x 96).
const ORIGIN = { x: 96, y: 54 + TOP + DISPLAY };

export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="accent">
      <Safe>
        <Stack gap={32} class="absolute left-0 max-w-[1200px]" style={`top:${TOP}px`}>
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
    // The hold's ambient life: the slow field alone reads as still, so a 2% push on the
    // statement's left edge carries the read, from the moment its lines land (0.4). It comes to
    // rest as the carry's lead-in starts (end − 0.2), so the carry out is a pure translate.
    m.camera({ scale: [1, 1.02] }, { at: 0.4, duration: m.time("end") - 0.2 - 0.4, ease: DRIFT, origin: ORIGIN });
  },
});
