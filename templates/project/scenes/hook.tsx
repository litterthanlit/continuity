import { scene, Stage, Safe, Stack, Label, Headline } from "continuity";

// litt: asymmetric and left-aligned, a label 8px above the one display line,
// lit from the top. Rank comes from weight, two inks and space.
export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Safe>
        <Stack gap={8} class="absolute bottom-[96px] left-[96px] max-w-[1200px]">
          <Label ct="label">{text.label}</Label>
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
