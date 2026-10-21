import { scene, Stage, Headline } from "continuity";
import { push, TypeStack } from "../lib/layout.js";

// The hero: lit from above, the claim in two lines broken by meaning.
// Rank by ink — once "a craft." is placed, the setup line steps to the grey.
export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <TypeStack>
        <Headline ct="l1">{text.l1}</Headline>
        <Headline ct="l2">{text.l2}</Headline>
      </TypeStack>
    </Stage>
  ),
  motion: (m, ctx) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b2", split: "lines", ease: "expressive" });
    m.emphasize("l1", "dim", { at: "b3" });
    push(m, ctx);
  },
});
