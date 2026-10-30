import { scene, Stage, Card, Label, Caption, El } from "continuity";

// The proof as a number. The tile arrives from the last card: the morph carries it, and the
// morph is the scene's moment. A morph pair is settled at the handoff (the carrier holds a clone
// of the tile as it is at rest), so the value arrives with the tile, not after it. The tile has
// the card's aspect (768×304 against 491×194), so the copy scales without stretching in flight.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Card ct="tile" class="absolute left-1/2 top-1/2 flex h-[304px] w-[768px] -translate-x-1/2 -translate-y-1/2 flex-col justify-center">
        <Label ct="label">{text.label}</Label>
        <El ct="value" class="mt-[16px] font-title text-display tabular-nums">{text.value}</El>
        <Caption ct="note" class="mt-[16px] text-fg-muted">{text.note}</Caption>
      </Card>
    </Stage>
  ),
  motion: (m) => {
    m.camera({ scale: [1, 1.04] });
  },
});
