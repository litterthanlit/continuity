import { scene, Stage, Safe, Center, Headline, Body, Button } from "continuity";
import { Lines, breakAfter } from "../lib/index.js";

// The end card: the payoff on the site's black smoke, then the way in. The film's one centred
// frame (litt allows Center once per video, for an end card): every other statement sits at
// HEAD_TOP on the left edge, so centring here reads as the full stop, not a new layout.
// One ink on the field (text-canvas); rank from size and weight. The CTA is the site's
// "Join the pilot": a light pill on black — the primary button in the canvas fill, fg text.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="accent">
      <Safe>
        <Center>
          <Headline ct="headline" class="text-canvas">
            <Lines lines={breakAfter(text.headline, "starts")} />
          </Headline>
          <Button ct="cta" variant="primary" size="lg" class="mt-[64px] bg-canvas text-fg">
            {text.cta}
          </Button>
          <Body ct="url" class="mt-[32px] text-canvas">
            {text.url}
          </Body>
        </Center>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    m.enter("cta", "rise", { at: "cta" });
    m.enter("url", "fade", { at: "cta+0.1" });
    m.camera({ scale: [1, 1.02] });
  },
});
