import { scene, Stage, Center, Label, Headline, Body } from "continuity";

// The piece's one centered statement, on the field again: a lockup — the label
// 8px over the wordmark, the tagline 32px under it. Center sits 154px high so the
// lockup is centered in the social safe zone (12% top, 20% bottom), not the frame.
// One ink on the field: the greys fall under 3:1 somewhere on accent, fg clears all of it
// (docs/decisions/0011); the hierarchy holds by size and weight.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="accent">
      <Center class="pb-[154px]">
        <Label ct="label" class="text-fg">{text.label}</Label>
        <Headline ct="wordmark" class="mt-[8px]">
          {text.wordmark}
        </Headline>
        <Body ct="tagline" class="mt-[32px] text-fg">
          {text.tagline}
        </Body>
      </Center>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("wordmark", "settle", { at: "b1+0.08" });
    m.enter("tagline", "rise", { at: "b2" });
    m.camera({ scale: [1, 1.03] });
  },
});
