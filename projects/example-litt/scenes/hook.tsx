import { scene, Stage, Safe, Headline, Caption } from "continuity";

/**
 * Hook. One calm promise on the lit backdrop: two display lines low-left, a mono
 * caption naming the file behind the frame. The top of the frame stays empty so the
 * accent light from above has nothing to compete with.
 *
 * Grid (6x6 over the title-safe area, rows 162px): l1 sits in row 4 (A4:D4), l2 in
 * row 5 (A5:D5), the file caption just under it in row 6 (A6). The block is placed
 * from the top of row 4 so it stays on the grid whatever the line box adds.
 *
 * Lit precision: one weight, sentence case, one colour per line (no word picked out),
 * hierarchy by size (168px display over a 30px caption) then colour (fg over subtle).
 * The backdrop, grain and light are static and the camera is locked.
 */
export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        {/* Row 4 starts 3 x 162px = 486px below the safe top; the block runs down through row 6. */}
        <div class="absolute left-0 top-[486px] flex flex-col items-start">
          <Headline ct="l1" size="display" class="whitespace-nowrap">
            {text.l1}
          </Headline>
          <Headline ct="l2" size="display" as="p" class="whitespace-nowrap">
            {text.l2}
          </Headline>
          {/* The only label in the film: the source of this very frame. Mono, quiet, no eyebrow. */}
          <Caption ct="file" class="mt-[40px] font-mono whitespace-nowrap">
            {text.file}
          </Caption>
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("l1", "rise", { at: "b1", split: "words", stagger: "word", distance: 32, duration: "slow", ease: "snappy" });
    m.enter("l2", "rise", { at: "b1+0.12", split: "words", stagger: "word", distance: 32, duration: "slow", ease: "snappy" });
    m.type("file", { at: "b2", cps: 16 });
  },
});
