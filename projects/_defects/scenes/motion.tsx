import { scene, Stage, Headline, Body, Stack, Safe, spring } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={20}>
          <Headline ct="slide" size="title">Linear slide</Headline>
          <Body ct="long">{text.long}</Body>
          <Body ct="a">{text.a}</Body>
          <Body ct="b">{text.b}</Body>
          <Body ct="c">{text.c}</Body>
          <Body ct="rocket">Launch 🚀</Body>
          <Body ct="missingCopy">{text.nope}</Body>
          <Body ct="toy">Toy</Body>
          <Body ct="far">Far</Body>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.tween("slide", { x: [-200, 0] }, { at: 0.9, duration: 0.5, ease: "linear", kind: "enter" }); // ease-linear + slow-open + travel-too-far
    m.enter("slide", "rise", { at: 1.0 });
    m.exit("slide", "fadeOut", { at: 1.1 }); // settle-interrupted
    m.enter("long", "fade", { at: 1.2 });
    m.exit("long", "fadeOut", { at: 2.0 }); // read-time
    m.enter(["a", "b", "c"], "rise", { at: 2.0, stagger: 0 }); // unstaggered-group
    m.enter("ghost", "fade", { at: 2.0 }); // target-missing
    m.enter("toy", "rise", { at: 1.3, ease: spring(0.35, 0.4) }); // spring-bounce + a second expressive moment (expressive-budget)
    m.exit("toy", "fadeOut", { at: 2.2, ease: "expressive" }); // exit-bounce
    m.enter("far", "settle", { at: 1.4, distance: 200 }); // travel-too-far + expressive-budget
    m.tween("far", { tracking: [0, 0.1] }, { at: 2.4, duration: "instant", ease: "out", kind: "emphasis" }); // property-motion
    m.enter("rocket", "rise", { at: 5.7 }); // late-entrance + scene-overrun (dead-air before it)
  },
});
