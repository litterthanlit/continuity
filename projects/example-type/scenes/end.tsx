import { scene, Stage, Center, Stack, Eyebrow, Headline, Subhead, Glow } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <Glow ct="glow" size={1200} x="50%" y="47%" opacity={0.3} />
      <Center>
        <Stack gap={34} class="items-center">
          <Eyebrow ct="eyebrow" class="text-accent">{text.eyebrow}</Eyebrow>
          <Headline ct="wordmark" size="display" class="whitespace-nowrap">{text.wordmark}</Headline>
          <Subhead ct="tagline" size="lead">{text.tagline}</Subhead>
        </Stack>
      </Center>
    </Stage>
  ),
  motion: (m) => {
    // Broadside's signature, used once: the wordmark settles from wide to its 66% width.
    m.enter("wordmark", "widthIn", { at: "b1", split: "chars", stagger: "char" });
    m.enter("tagline", "rise", { at: "b2", distance: 20 });
    m.enter("eyebrow", "fadeBlur", { at: "b3" });
    m.loop("glow", { scale: 0.06 }, { period: 5 });
    m.camera({ scale: [1.03, 1] });
  },
});
