import { scene, Stage, Safe, Center, Headline, Body, Button, Caption, Cursor } from "continuity";

// End card — the film's only centred frame, in the light again. The wordmark
// (the display line) 32px over the tagline in the grey, then the film's one
// primary call to action, and the address in mono under it. Then the hand: a
// cursor glides onto the button and presses it — the film ends on the action.
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
          <Caption ct="url" class="mt-[24px] font-mono">
            {text.url}
          </Caption>
        </Center>
      </Safe>
      {/* Rests below-right of the button; the path carries its tip onto the label. */}
      <Cursor ct="cursor" class="left-[1296px] top-[864px]" />
    </Stage>
  ),
  motion: (m) => {
    // b1 — the name is placed (the moment), b2 the promise, b3 the call to action.
    m.enter("wordmark", "settle", { at: "b1" });
    m.enter("tagline", "rise", { at: "b2" });
    m.enter("cta", "rise", { at: "b3" });
    m.enter("url", "fade", { at: "after:cta-0.2" });
    // b4 — the hand: one eased leg onto the button, a beat of stillness, the press.
    m.enter("cursor", "fade", { at: "b4" });
    m.path("cursor", [{ x: -312, y: -240 }], { at: "b4+0.1", duration: "slow" });
    m.click("cursor", { at: "b4+0.95" });
    m.emphasize("cta", "press", { at: "b4+0.95" });
    // The last frame: the push eases in out of the dip and cruises into the end.
    m.camera({ scale: [1, 1.03] }, { ease: { type: "bezier", p: [0.33, 0, 0.67, 0.67] } });
  },
});
