import { scene } from "continuity";
import { Card, cardMotion } from "../lib/card.js";

export default scene({
  view: ({ text }) => <Card text={text} bg="aurora" side="right" />,
  motion: (m) => cardMotion(m, false),
});
