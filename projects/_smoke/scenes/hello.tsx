import { scene, Stage, Safe, Headline, Label, Stack } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Safe>
        <Stack gap={8} class="absolute bottom-[96px] left-[96px] max-w-[1100px]">
          <Label ct="label">{text.label}</Label>
          <Headline ct="title">{text.title}</Headline>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("title", "maskUp", { at: "b1+0.08", split: "words", ease: "expressive" });
    m.camera({ scale: [1, 1.03] });
  },
});
