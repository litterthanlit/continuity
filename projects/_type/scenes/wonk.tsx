import { scene } from "continuity";
import { Specimen, specimenMotion } from "../lib/specimen.js";

export default scene({
  view: ({ text }) => <Specimen text={text} value={1979} decimals={0} />,
  motion: (m) =>
    specimenMotion(m, 1979, 0, (m) => {
      m.enter("title", "maskUp", { at: "b1+0.15", split: "lines" });
      // Serifs start sharp and soften as the line lands (Fraunces SOFT axis; WONK stays on from the kit).
      m.tween("title", { soft: [0, 100] }, { at: "b1+0.15", duration: "linger", ease: "hero", kind: "emphasis" });
    }),
});
