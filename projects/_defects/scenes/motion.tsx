import { scene, Stage, Headline, Body, Stack, Safe } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={20}>
          <Headline ct="slide" size="h3">Linear slide</Headline>
          <Body ct="long">{text.long}</Body>
          <Body ct="a">{text.a}</Body>
          <Body ct="b">{text.b}</Body>
          <Body ct="c">{text.c}</Body>
          <Body ct="rocket">Launch 🚀</Body>
          <Body ct="missingCopy">{text.nope}</Body>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.tween("slide", { x: [-200, 0] }, { at: 0.9, duration: 0.5, ease: "linear", kind: "enter" }); // ease-linear + slow-open
    m.enter("slide", "rise", { at: 1.0 });
    m.exit("slide", "fadeOut", { at: 1.1 }); // settle-interrupted
    m.enter("long", "fade", { at: 1.2 });
    m.exit("long", "fadeOut", { at: 2.0 }); // read-time
    m.enter(["a", "b", "c"], "rise", { at: 2.0, stagger: 0 }); // unstaggered-group
    m.enter("ghost", "fade", { at: 2.0 }); // target-missing
    m.enter("rocket", "rise", { at: 5.6 }); // late-entrance + scene-overrun (0.64s from 5.6 > 6)
  },
});
