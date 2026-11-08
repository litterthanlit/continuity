import { scene, Stage, Safe, Stack, Headline, Body, Button } from "continuity";
import { DISPLAY, DRIFT, HEAD_TOP, Lines, breakAfter } from "../lib/index.js";

// The end card: the payoff on the site's black smoke, then the way in — composed as the site's
// hero (hypher.app): the statement top-left, the light "Join the pilot" pill under it, the
// plume in the open frame to the right and below. One ink on the field (text-canvas); rank from
// size and weight. The CTA is the site's primary: a light pill on black, fg text.
//
// Placement: the statement sits on trust's headline line (HEAD_TOP) on the left edge, so the
// still cut from trust swaps one statement for the next in place (as hook → turn does). Why not
// centred: the field runs on global time and its plume always lives around the frame's middle
// (the shader's colour centres stay within ±0.42 field units of it); on the end window it sits
// centre-right and low, so a centred block put the headline and the pill on luma 50–130. Top-left,
// the copy keeps black under it at every frame (theme.ts tunes the field for this window).
const ORIGIN = { x: 96, y: 54 + HEAD_TOP + DISPLAY };

export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="accent">
      <Safe>
        <Stack gap={0} class="absolute left-0 items-start" style={`top:${HEAD_TOP}px`}>
          <Headline ct="headline" class="text-canvas">
            <Lines lines={breakAfter(text.headline, "starts")} />
          </Headline>
          <Button ct="cta" variant="primary" size="lg" class="mt-[64px] bg-canvas text-fg">
            {text.cta}
          </Button>
          <Body ct="url" class="mt-[32px] text-canvas">
            {text.url}
          </Body>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    m.enter("cta", "rise", { at: "cta" });
    m.enter("url", "fade", { at: "cta+0.1" });
    // The push holds the statement's left edge (between its lines), so the block never walks
    // out of title-safe; the film's ambient ease.
    m.camera({ scale: [1, 1.02] }, { ease: DRIFT, origin: ORIGIN });
  },
});
