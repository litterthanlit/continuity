import { scene, Stage, Headline, Serif, Emph } from "continuity";
import { TypeStack } from "../lib/layout.js";

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <TypeStack>
        <Headline ct="l1" size="display">{text.l1}</Headline>
        <Headline ct="l2" size="display">
          <Emph text={text.l2} word="craft.">{(w) => <Serif class="text-accent">{w}</Serif>}</Emph>
        </Headline>
      </TypeStack>
    </Stage>
  ),
  motion: (m) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b2", split: "lines" });
    m.camera({ scale: [1, 1.04] });
    m.loop("bg", { scale: 0.03 }, { period: 7 });
  },
});
