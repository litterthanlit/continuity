import { scene, Stage, Headline, El, Emph } from "continuity";
import { push, TypeStack } from "../lib/layout.js";

// Tension, in two lines broken by meaning: "But they can't / see it." The
// piece's ink rule inverted — here the key word goes grey: "see" steps out of
// fg, the thing they can't do.
export default scene({
  view: ({ text }) => (
    <Stage>
      <TypeStack>
        {/* l1 and l2 share the first line; the gap is Geist's word space at the display step. */}
        <div class="flex gap-[22px]">
          <Headline ct="l1">{text.l1}</Headline>
          <Headline ct="l2">{text.l2}</Headline>
        </div>
        <Headline ct="l3">
          <Emph text={text.l3} word="see">
            {(w) => (
              <El as="span" ct="see">
                {w}
              </El>
            )}
          </Emph>
        </Headline>
      </TypeStack>
    </Stage>
  ),
  motion: (m, ctx) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    // the same line: a word's stagger (40ms) behind l1, not a line's
    m.enter("l2", "maskUp", { at: "b1+0.04", split: "lines" });
    m.enter("l3", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.emphasize("see", "dim", { at: "b2" });
    push(m, ctx);
  },
});
