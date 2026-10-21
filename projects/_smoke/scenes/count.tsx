import { scene, Stage, Safe, Counter, Label, Stack } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <Stack gap={8} class="absolute bottom-[96px] left-[96px]">
          <Label ct="label">{text.label}</Label>
          <Counter ct="num" class="font-display text-display font-title text-fg" />
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.counter("num", { to: 1280, at: "b1", duration: "linger" });
    m.camera({ scale: [1, 1.03] });
  },
});
