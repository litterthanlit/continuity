import { scene, Stage, Safe, Stack, Headline, Title, Label, Body, El } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={16}>
          <Label ct="label">{text.label}</Label>
          <Headline ct="role">{text.role}</Headline>
          <Title ct="title">{text.title}</Title>
          <Body ct="body">{text.body}</Body>
          <Headline ct="override" size="title" class="font-normal">{text.override}</Headline>
          <El ct="mono" as="p" class="font-mono text-small">{text.mono}</El>
        </Stack>
      </Safe>
    </Stage>
  ),
});
