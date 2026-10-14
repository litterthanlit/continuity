import { scene } from "continuity";
import { Specimen, specimenMotion } from "../lib/specimen.js";

export default scene({
  view: ({ text }) => <Specimen text={text} value={4.2} decimals={1} />,
  motion: (m) => specimenMotion(m, 4.2, 1),
});
