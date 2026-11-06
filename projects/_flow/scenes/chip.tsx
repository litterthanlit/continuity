import { scene, El, Headline, Label, Safe, Stack, Stage } from "continuity";
import { CARD } from "./card.js";

// The accent chip under the title. It is already moving right when the cut lands: the match
// carries its speed into the card it becomes (motion-craft §8, match v2).
export const CHIP_TRAVEL = 480;

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={8} class="absolute left-0" style={{ top: `${CARD.top}px` }}>
          <Label ct="label">{text.label}</Label>
          <Headline ct="title">{text.title}</Headline>
        </Stack>
        <El
          ct="chip"
          class="absolute left-0 inline-flex h-[88px] items-center rounded-full bg-accent px-[40px] font-sans text-[32px] font-title text-accent-fg"
          style={{ top: `${CARD.top + 456}px` }}
        >
          {text.chip}
        </El>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("title", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.enter("chip", "rise", { at: "after:title-0.2" });
    // t² into the cut (the carry's own lead-in, transitions.ts QUAD_IN): it accelerates and is at
    // its fastest on the last frame, so the match has a speed to hand over.
    m.tween("chip", { x: [0, CHIP_TRAVEL] }, { at: "end-0.6", duration: 0.6, ease: { type: "bezier", p: [1 / 3, 0, 2 / 3, 1 / 3] } });
  },
});
