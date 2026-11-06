import { scene, Stage, Safe, Stack, Label, Headline } from "continuity";

// litt: asymmetric and left-aligned, a label 8px above the one display line,
// over the accent field. Rank comes from weight, two inks and space; over a field
// the label takes the fg ink (the muted one fails contrast on the brighter colours).
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="accent">
      <Safe>
        <Stack gap={8} class="absolute bottom-[96px] left-[96px] max-w-[1200px]">
          <Label ct="label" class="text-fg">{text.label}</Label>
          <Headline ct="headline">{text.headline}</Headline>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.camera({ scale: [1, 1.03] });
  },
});
