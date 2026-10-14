import { scene } from "continuity";
import { Specimen, specimenMotion } from "../lib/specimen.js";

export default scene({
  view: ({ text }) => <Specimen text={text} value={125} decimals={0} />,
  motion: (m) =>
    specimenMotion(m, 125, 0, (m) => {
      // Letters settle from wide, then a width wave breathes through them (Mona Sans wdth 75–125).
      m.enter("title", "widthIn", { at: "b1+0.15", split: "chars", stagger: "char" });
      m.emphasize("title", "widthPulse", { at: "b1+1.6", split: "chars", stagger: "char" });
    }),
});
