import { scene, Stage, Headline, Path } from "continuity";
import { push, TypeStack } from "../lib/layout.js";

// Proof. The check is drawn in fg at the display stem weight, on the baseline of "checked."
export default scene({
  view: ({ text }) => (
    <Stage>
      <TypeStack>
        <Headline ct="l1">{text.l1}</Headline>
        <div class="flex items-end gap-[24px]">
          <Headline ct="l2">{text.l2}</Headline>
          <Path ct="tick" d="M6 44 L30 68 L82 8" viewBox="0 0 88 76" width={88} height={76} strokeWidth={11} class="mb-[22px]" />
        </div>
      </TypeStack>
    </Stage>
  ),
  motion: (m, ctx) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.enter("tick", "draw", { at: "b2" });
    m.emphasize("l1", "dim", { at: "b2" });
    push(m, ctx);
  },
});
