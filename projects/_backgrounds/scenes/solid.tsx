import { scene, Headline, Label, Safe, Stage } from "continuity";

// One flat colour: the canvas. The statement the gallery makes, in the two inks.
export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Label ct="label" class="absolute top-[64px] left-0">
          {text.label}
        </Label>
        <Headline ct="title" class="absolute top-1/2 left-0 -translate-y-1/2">
          {text.title}
        </Headline>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("title", "maskUp", { at: 0, split: "lines", ease: "expressive" });
  },
});
