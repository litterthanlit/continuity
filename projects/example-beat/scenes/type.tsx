import { scene, Stage, Row, Headline } from "continuity";
import { LEFT } from "../lib/layout.js";

// The feel, in three words, each doing what it says on its beat. Whip. snaps in (1.5 frames,
// blurred, stretched along its path). Drift. is there at once and slides the whip's distance slowly
// on an out ease. Land. is there at once and drops in on pop, squashing against the stop.
export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Row gap={48} class="absolute top-1/2 -translate-y-1/2" style={`left:${LEFT}px`}>
        <Headline ct="w1">{text.w1}</Headline>
        <Headline ct="w2" class="text-fg-muted">{text.w2}</Headline>
        <Headline ct="w3">{text.w3}</Headline>
      </Row>
    </Stage>
  ),
  motion: (m) => {
    m.enter("w1", "whip", { at: "w1", duration: "slow", squash: 0.3 });
    // Cut on (opacity in zero time, like the whip's first frame), so neither word fades.
    for (const w of ["w2", "w3"]) m.tween(w, { opacity: [0, 1] }, { at: w, duration: 0, kind: "enter" });
    m.tween("w2", { x: [160, 0] }, { at: "w2", ease: "out", duration: "slow", kind: "enter" });
    m.tween("w3", { y: [-96, 0] }, { at: "w3", ease: "pop", duration: "snap", squash: 0.3, kind: "enter" });
  },
});
