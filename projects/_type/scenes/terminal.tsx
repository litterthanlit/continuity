import { scene } from "continuity";
import { Specimen, specimenMotion } from "../lib/specimen.js";

export default scene({
  view: ({ text }) => <Specimen text={text} value={312} decimals={0} />,
  motion: (m) => specimenMotion(m, 312, 0),
});
