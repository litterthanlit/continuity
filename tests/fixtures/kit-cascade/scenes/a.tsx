import { scene, Stage, Safe, Stack, Headline, Eyebrow, Serif } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={16}>
          <Headline ct="role" size="h2">{text.role}</Headline>
          <Headline ct="bold" size="h2" class="font-bold">{text.bold}</Headline>
          <Eyebrow ct="label">{text.label}</Eyebrow>
          <Eyebrow ct="wide" class="tracking-[0.3em]">{text.wide}</Eyebrow>
          <Headline ct="line" size="h2">x <Serif ct="accent">{text.accent}</Serif></Headline>
        </Stack>
      </Safe>
    </Stage>
  ),
});
