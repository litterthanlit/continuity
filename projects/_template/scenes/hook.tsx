import { scene, Stage, Safe, Center, Stack, Eyebrow, Headline } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <Center>
          <Stack gap={28} class="items-center">
            <Eyebrow ct="eyebrow">{text.eyebrow}</Eyebrow>
            <Headline ct="headline" size="display" class="max-w-[1400px]">
              {text.headline}
            </Headline>
          </Stack>
        </Center>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("eyebrow", "fadeBlur", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.12", split: "lines" });
    m.camera({ scale: [1, 1.035] });
  },
});
