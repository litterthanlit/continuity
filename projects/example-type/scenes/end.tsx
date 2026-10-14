import { scene, Stage, Safe, Center, Stack, Eyebrow, Headline, Subhead, Glow } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <Glow ct="glow" size={1200} x="47%" y="46%" opacity={0.3} />
      <Safe zone="social">
        <Center>
          <Stack gap={34} class="items-center">
            <Eyebrow ct="eyebrow" class="text-accent">{text.eyebrow}</Eyebrow>
            <Headline ct="wordmark" size="display" class="whitespace-nowrap">{text.wordmark}</Headline>
            <Subhead ct="tagline" size="lead">{text.tagline}</Subhead>
          </Stack>
        </Center>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // Broadside's signature, used once: after the punch lands, the wordmark settles
    // from 78% to its 66% width, outward from the centre.
    m.enter("wordmark", "widthIn", { at: "b1", split: "chars", stagger: { each: "char", from: "center" }, width: 78, duration: "hero" });
    m.enter("eyebrow", "fadeBlur", { at: "b2" });
    m.enter("tagline", "rise", { at: "b3", distance: 20 });
    m.loop("glow", { scale: 0.06 }, { period: 5 });
    m.camera({ scale: [1.03, 1] });
  },
});
