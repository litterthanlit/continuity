import { scene } from "continuity";
import { Specimen, specimenMotion } from "../lib/specimen.js";

export default scene({
  // litt sets the headline plain: one weight, no accent word, no serif or italic.
  view: ({ text }) => <Specimen text={text} value={400} decimals={0} plain />,
  motion: (m) => specimenMotion(m, 400, 0),
});
