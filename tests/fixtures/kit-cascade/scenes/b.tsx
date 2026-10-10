import { scene, Stage, Safe, Stack, Headline, Serif } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={16}>
          <Headline ct="role" size="h2">{text.role}</Headline>
          <Headline ct="line" size="h2">x <Serif ct="accent">{text.accent}</Serif></Headline>
        </Stack>
      </Safe>
    </Stage>
  ),
});
