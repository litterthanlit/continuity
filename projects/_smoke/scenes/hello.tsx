import { scene, Stage, Center, Headline, Eyebrow, Stack } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage>
      <Center>
        <Stack gap={28} class="items-center">
          <Eyebrow ct="eyebrow">{text.eyebrow}</Eyebrow>
          <Headline ct="title" size="h1" class="max-w-[1300px]">{text.title}</Headline>
        </Stack>
      </Center>
    </Stage>
  ),
  motion: (m) => {
    m.enter("eyebrow", "fadeBlur", { at: "b1" });
    m.enter("title", "maskUp", { at: "b1+0.15", split: "words" });
    m.camera({ scale: [1, 1.04] });
  },
});
