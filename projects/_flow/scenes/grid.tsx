import { scene, Card, Headline, Label, Safe, Stack, Stage } from "continuity";

// Three 16:9 tiles. The middle one is the portal: its shape is the next scene's frame.
const TILE_W = 544;
const TILE_H = 306;

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={8} class="absolute top-[64px] left-0">
          <Label ct="label">{text.label}</Label>
          <Headline ct="title">{text.title}</Headline>
        </Stack>
        <div data-ct="tiles" class="absolute bottom-[96px] left-0 flex gap-[48px]">
          {[1, 2, 3].map((k) => (
            <Card ct={`c${k}`} class="flex items-end !p-[32px]" style={{ width: `${TILE_W}px`, height: `${TILE_H}px` }}>
              <Label ct={`t${k}`}>{text[`t${k}`]}</Label>
            </Card>
          ))}
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("title", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.enter(["c1", "c2", "c3"], "rise", { at: "after:title-0.3", stagger: "list" });
  },
});
