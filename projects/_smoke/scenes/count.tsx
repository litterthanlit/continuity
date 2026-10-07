import { scene, Stage, Center, Counter, Caption, Stack } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Center>
        <Stack gap={12} class="items-center">
          <Counter ct="num" class="font-display text-mega font-semibold" />
          <Caption ct="label">{text.label}</Caption>
        </Stack>
      </Center>
    </Stage>
  ),
  motion: (m) => {
    m.counter("num", { to: 1280, at: "b1", duration: "linger" });
    m.enter("label", "rise", { at: "b1+0.2" });
  },
});
