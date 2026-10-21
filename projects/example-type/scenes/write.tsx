import { scene, Stage, Headline, El } from "continuity";
import { push, TypeStack, CARET } from "../lib/layout.js";

// The turn: "write it." is written — typed on at a human rate, then the caret waits.
export default scene({
  view: ({ text }) => (
    <Stage>
      <TypeStack>
        <Headline ct="l1">{text.l1}</Headline>
        <div class="flex items-center gap-[12px]">
          <Headline ct="l2">{text.l2}</Headline>
          <El ct="caret" data-layout-ignore class={CARET} />
        </div>
      </TypeStack>
    </Stage>
  ),
  motion: (m, ctx) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.emphasize("l1", "dim", { at: "b2" });
    m.type("l2", { at: "b2" });
    m.enter("caret", "fade", { at: "after:l2", duration: "instant", ease: "out" });
    m.blink("caret", { at: "after:caret", until: "end" });
    push(m, ctx);
  },
});
