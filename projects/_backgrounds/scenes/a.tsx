import { scene, Label, Safe, Stage } from "continuity";

// Ink, not fg: aurora's cyan is too light for fg type at 3:1; canvas ink clears every part of the field.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="aurora">
      <Safe>
        <Label ct="label" class="absolute top-[64px] left-0 text-canvas">
          {text.label}
        </Label>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
  },
});
