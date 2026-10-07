import { scene, Stage, Headline, El, Emph } from "continuity";
import { TypeStack } from "../lib/layout.js";

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <TypeStack>
        <Headline ct="l1" size="display">{text.l1}</Headline>
        <Headline ct="l2" size="display" class="text-muted">{text.l2}</Headline>
        <Headline ct="l3" size="display">
          <Emph text={text.l3} word="see">{(w) => <El as="span" ct="see">{w}</El>}</Emph>
        </Headline>
      </TypeStack>
    </Stage>
  ),
  motion: (m) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b1+0.12", split: "lines" });
    m.enter("l3", "maskUp", { at: "b1+0.24", split: "lines" });
    // The problem, made visible: the word "see" drifts out of focus.
    m.tween("see", { blur: [0, 16], opacity: [1, 0.5] }, { at: "b2", duration: "slow", ease: "standard", kind: "emphasis" });
    m.camera({ scale: [1, 1.03] });
  },
});
