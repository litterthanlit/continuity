import { scene, Stage, Body } from "continuity";

// litt-light's fg (near-black) over ember, which stays dark at the lower left through this scene:
// the contrast audit must see the field it sits on (it samples the rendered frame, canvas
// included — docs/decisions/0011).
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="ember" grain={false}>
      <Body ct="over-field" class="absolute left-[200px] top-[920px] text-fg">{text["over-field"]}</Body>
    </Stage>
  ),
});
