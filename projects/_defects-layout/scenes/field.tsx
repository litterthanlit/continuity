import { scene, Stage, Body } from "continuity";

// litt-light's grey over the luminous ember field: 5:1 on the canvas, under 2:1 on any colour the
// field passes through, so only a contrast audit that sees the canvas pixels catches it (it samples
// the rendered frame, canvas included — docs/decisions/0011).
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="ember" grain={false}>
      <Body ct="over-field" class="absolute left-[200px] top-[920px] text-fg-muted">{text["over-field"]}</Body>
    </Stage>
  ),
});
