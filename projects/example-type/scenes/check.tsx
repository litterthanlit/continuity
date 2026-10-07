import { scene, Stage, Headline, Path } from "continuity";
import { TypeStack } from "../lib/layout.js";

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <TypeStack>
        <Headline ct="l1" size="h1">{text.l1}</Headline>
        <div class="flex items-center gap-[28px]">
          <Headline ct="l2" size="h1">{text.l2}</Headline>
          <Path ct="tick" d="M6 52 L38 84 L104 12" viewBox="0 0 110 96" width={110} height={96} strokeWidth={14} />
        </div>
      </TypeStack>
    </Stage>
  ),
  motion: (m) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b1+0.15", split: "lines" });
    m.enter("tick", "draw", { at: "b2", duration: "slow" });
    m.camera({ scale: [1, 1.03] });
  },
});
