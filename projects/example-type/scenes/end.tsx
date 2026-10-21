import { scene, Stage, Center, Label, Headline, Body } from "continuity";

// The piece's one centered statement, lit from above again: a lockup — the label
// 8px over the wordmark, the tagline 32px under it. Center sits 154px high so the
// lockup is centered in the social safe zone (12% top, 20% bottom), not the frame.
export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Center class="pb-[154px]">
        <Label ct="label">{text.label}</Label>
        <Headline ct="wordmark" class="mt-[8px]">
          {text.wordmark}
        </Headline>
        <Body ct="tagline" class="mt-[32px]">
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
