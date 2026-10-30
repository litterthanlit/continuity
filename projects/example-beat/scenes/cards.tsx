import { scene, Stage, Card, Label, Title, Row } from "continuity";

// What it does with the beat, one card per kick: each whips in from the right with a blurred
// snap and stretches along its path. The last one carries the cut into the next scene.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Row gap={32} class="absolute left-[192px] right-[192px] top-1/2 -translate-y-1/2 items-stretch">
        {[1, 2, 3].map((i) => (
          <Card ct={`c${i}`} class="flex-1" key={i}>
            <Label ct={`k${i}`}>{text[`k${i}`]}</Label>
            <Title ct={`v${i}`} class="mt-[8px]">{text[`v${i}`]}</Title>
          </Card>
        ))}
      </Row>
    </Stage>
  ),
  motion: (m) => {
    m.enter("c1", "whip", { at: "c1", duration: "slow", squash: 0.2 });
    m.enter("c2", "whip", { at: "c2", duration: "slow", squash: 0.2 });
    m.enter("c3", "whip", { at: "c3", duration: "slow", squash: 0.2 });
  },
});
