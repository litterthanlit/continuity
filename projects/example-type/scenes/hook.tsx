import { scene, Stage, Headline } from "continuity";
import { push, TypeStack } from "../lib/layout.js";

// The hero, on the moving accent field: the claim in two lines broken by meaning. On the field
// the type keeps one ink (the grey falls under 3:1 on its cobalt — docs/decisions/0011), so
// "a craft." leads by landing last, on the expressive spring; the piece's rank-by-ink starts
// on the solid canvas of the next scene.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="accent">
      <TypeStack>
        <Headline ct="l1">{text.l1}</Headline>
        <Headline ct="l2">{text.l2}</Headline>
      </TypeStack>
    </Stage>
  ),
  motion: (m, ctx) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b2", split: "lines", ease: "expressive" });
    push(m, ctx);
  },
});
