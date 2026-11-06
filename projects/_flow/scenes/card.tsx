import { scene, Body, Card, Headline, Label, Safe, Stack, Stage, Title } from "continuity";

// The card the chip becomes: a raised surface on the right, further along the chip's travel, so
// the move carries on through the cut and settles here. Copy stays where it was (matched too).
export const CARD = { top: 64, width: 880, height: 560 };

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={8} class="absolute left-0" style={{ top: `${CARD.top}px` }}>
          <Label ct="label">{text.label}</Label>
          <Headline ct="title">{text.title}</Headline>
        </Stack>
        <Body ct="sub" class="absolute left-0 w-[640px]" style={{ top: `${CARD.top + 320}px` }}>
          {text.sub}
        </Body>
        <Card ct="card" class="absolute right-0 bottom-0 flex flex-col justify-end" style={{ width: `${CARD.width}px`, height: `${CARD.height}px` }}>
          <Stack gap={8}>
            <Label ct="meta">{text.meta}</Label>
            <Title ct="status">{text.status}</Title>
          </Stack>
        </Card>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // The card lands at the match's end (b1); what it holds follows it in.
    m.enter("sub", "rise", { at: "b1-0.2" });
    m.enter(["meta", "status"], "rise", { at: "b1", stagger: "list" });
  },
});
