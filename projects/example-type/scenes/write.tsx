import { scene, Stage, Headline, Highlight, Emph } from "continuity";
import { TypeStack } from "../lib/layout.js";

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <TypeStack>
        <Headline ct="l1" size="display">{text.l1}</Headline>
        <Headline ct="l2" size="display">
          <Emph text={text.l2} word="write">{(w) => <Highlight ct="hl">{w}</Highlight>}</Emph>
        </Headline>
      </TypeStack>
    </Stage>
  ),
  motion: (m) => {
    m.enter("l1", "rise", { at: "b1", split: "words", ease: "hero", distance: 64, duration: "slow" });
    m.enter("l2", "rise", { at: "b2", split: "words", ease: "hero", distance: 64, duration: "slow" });
    m.emphasize("hl-bar", "underline", { at: "after:l2-0.15" });
    m.camera({ scale: [1.03, 1] });
  },
});
