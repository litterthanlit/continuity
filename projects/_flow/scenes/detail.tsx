import { scene } from "continuity";
import { Chapter } from "../lib/frame.js";

export default scene({
  view: ({ text }) => <Chapter text={text} bg="solid" data={[30, 46, 38, 62, 55, 80, 96]} />,
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("sub", "rise", { at: "b1+0.1" });
  },
});
