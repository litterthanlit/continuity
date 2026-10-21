import { scene, Stage, Safe, Stack, Stat, El } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <Stack gap={48} class="absolute bottom-[96px] left-[96px]">
          <Stat ct="stat" value={1280} label={text.stat} size="display" delta={text.delta} deltaTone="success" />
          <El ct="id" as="p" class="font-mono text-small text-fg-subtle">{text.id}</El>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("stat-label", "fade", { at: "b1" });
    m.counter("stat", { from: 0, to: 1280, at: "b1", duration: "linger" });
    m.enter("stat-delta", "rise", { at: "b1+0.6" });
    m.enter("id", "fade", { at: "b1+0.8" });
    m.camera({ scale: [1, 1.03] });
  },
});
