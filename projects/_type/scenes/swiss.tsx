import { scene } from "continuity";
import { Specimen, specimenMotion } from "../lib/specimen.js";

export default scene({
  view: ({ text }) => <Specimen text={text} value={99.99} decimals={2} />,
  motion: (m) => specimenMotion(m, 99.99, 2),
});
