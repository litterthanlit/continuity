import { scene, Stage, Headline, Path } from "continuity";
import { TypeStack } from "../lib/layout.js";

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <TypeStack>
        <Headline ct="l1" size="display">{text.l1}</Headline>
        <Headline ct="l2" size="display">{text.l2}</Headline>
        <div class="flex items-center gap-[30px]">
          <Headline ct="l3" size="display">{text.l3}</Headline>
          <Path ct="tick" d="M6 52 L38 84 L104 12" viewBox="0 0 110 96" width={124} height={108} strokeWidth={16} />
        </div>
      </TypeStack>
    </Stage>
  ),
  motion: (m) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b1+0.12", split: "lines" });
    m.enter("l3", "maskUp", { at: "b1+0.24", split: "lines" });
    m.enter("tick", "draw", { at: "b2", duration: "slow" });
    m.camera({ scale: [1, 1.03] });
  },
});
