import { scene, Stage, Safe, Center, Headline, Body, Button } from "continuity";

// End card — the film's only centred frame, in the light again. The wordmark
// (the display line) 32px over the tagline in the grey, then the one accent
// fill of the film: the primary "Open source" button (the "Ship" station).
export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Safe>
        <Center>
          <Headline ct="wordmark">{text.wordmark}</Headline>
          <Body ct="tagline" class="mt-[32px]">
            {text.tagline}
          </Body>
          <Button ct="cta" variant="primary" class="mt-[64px]">
            {text.cta}
          </Button>
        </Center>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1 — the name is placed (the moment), b2 the promise, b3 the call to action.
    m.enter("wordmark", "settle", { at: "b1" });
    m.enter("tagline", "rise", { at: "b2" });
    m.enter("cta", "rise", { at: "b3" });
    // The film's last frame: the push eases in out of the dip and cruises into the
    // final frame (end slope 1) rather than braking to a dead stop.
    m.camera({ scale: [1, 1.03] }, { ease: { type: "bezier", p: [0.33, 0, 0.67, 0.67] } });
  },
});
