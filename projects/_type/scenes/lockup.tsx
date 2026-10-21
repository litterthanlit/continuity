import { scene, Stage, Safe, Stack, Headline, Body, Label } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Safe>
        <Stack gap={32} class="absolute bottom-[96px] left-[96px] max-w-[1120px]">
          <Stack gap={8}>
            <Label ct="label">{text.label}</Label>
            <Headline ct="headline">{text.headline}</Headline>
          </Stack>
          <Body ct="body" class="max-w-[800px]">{text.body}</Body>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.enter("body", "rise", { at: "after:headline-0.2" });
    m.camera({ scale: [1, 1.03] });
  },
});
