import { scene, Stage, Row, Headline } from "continuity";
import { LEFT } from "../lib/layout.js";

// The feel, in three words, each doing what it says on its beat: whipped in (a 1.5-frame snap,
// blurred and stretched along its path), then drifting the rest of the way.
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
    m.enter("w2", "whip", { at: "w2", dir: "up", duration: "slow", squash: 0.3 });
    m.enter("w3", "whip", { at: "w3", dir: "down", distance: 96, duration: "expressive", squash: 0.3 });
  },
});
