import { scene, Label, Safe, Stage } from "continuity";

// What was inside the tile: the same field, full frame. The label waits for the portal to land.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="aurora">
      <Safe>
        <Label ct="label" class="absolute top-[64px] left-0 text-fg">
          {text.label}
        </Label>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
  },
});
