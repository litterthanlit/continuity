import { scene, Label, Safe, Stage } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="accent">
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
