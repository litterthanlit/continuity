import { scene, Stage, Safe, Center, Headline, Body, Button } from "continuity";

// End card — the film's only centred frame, on the field. The wordmark (the display
// line) 32px over the tagline, then the one accent fill of the film: the primary
// "Open source" button (the "Ship" station). The field is `aurora`, not `accent`: on a
// cobalt field the cobalt button would sink into it; on aurora's violet, teal and rose it
// stays the one accent. One ink on the field: the grey falls under 3:1 on its brighter
// colours, large fg clears all of it (docs/decisions/0011); the tagline stays second by
// size and weight.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="aurora">
      <Safe>
        <Center>
          <Headline ct="wordmark">{text.wordmark}</Headline>
          <Body ct="tagline" class="mt-[32px] text-fg">
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
