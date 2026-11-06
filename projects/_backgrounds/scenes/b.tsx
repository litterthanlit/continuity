import { scene, Label, Safe, Stage } from "continuity";

// fg ink: aurora stays deep (luminance ≤ ~0.19), so large fg type clears 3:1 anywhere on it (4.1:1 at its
// brightest); the greys do not (docs/decisions/0011).
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
    m.enter("label", "rise", { at: "b1" });
  },
});
