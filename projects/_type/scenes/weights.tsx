import { scene, Stage, Safe, Stack, Title, Body, Label } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <Stack gap={32} class="absolute left-[96px] top-1/2 -translate-y-1/2">
          <Label ct="label" class="text-fg">{text.label}</Label>
          <Title ct="title" as="p">{text.title}</Title>
          <Body ct="body" class="text-fg">{text.body}</Body>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter(["label", "title", "body"], "rise", { at: "b1" });
    m.camera({ scale: [1, 1.02] });
  },
});
