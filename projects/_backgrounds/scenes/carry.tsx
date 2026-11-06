import { scene, Card, Label, Safe, Stage } from "continuity";

// Arrives on the carry (the camera still travelling left); the glass tile is the portal into the next scene.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="aurora">
      <Safe>
        <Label ct="label" class="absolute top-[64px] left-0 text-fg">
          {text.label}
        </Label>
      </Safe>
      <Card ct="tile" glass class="absolute top-1/2 left-1/2 h-[378px] w-[672px] -translate-x-1/2 -translate-y-1/2" />
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("tile", "slideLeft", { at: "b1+0.1" });
  },
});
