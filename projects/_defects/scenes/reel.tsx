import { scene, Stage, Safe, Headline } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Safe>
        <Headline ct="line">{text.line}</Headline>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("line", "fade", { at: "b1" });
  },
});
