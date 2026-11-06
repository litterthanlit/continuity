import { scene } from "continuity";
import { Chapter } from "../lib/frame.js";

export const NEXT_DATA = [96, 80, 62, 70, 48, 40, 28];

export default scene({
  view: ({ text }) => <Chapter text={text} bg="solid" data={NEXT_DATA} />,
  motion: (m) => {
    m.enter("sub", "rise", { at: "b1" });
  },
});
