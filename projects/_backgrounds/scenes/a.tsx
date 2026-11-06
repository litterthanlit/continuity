import { scene, Label, Safe, Stage } from "continuity";

// fg ink: aurora stays deep enough (luminance ≤ ~0.17) for fg type anywhere on it (docs/decisions/0011).
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
