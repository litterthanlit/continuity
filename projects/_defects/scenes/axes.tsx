import { scene, Stage, Headline, Stack, Safe } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={20}>
          <Headline ct="thin" size="title">{text.thin}</Headline>
          <Headline ct="wide" size="title">{text.wide}</Headline>
          <Headline ct="heavy" size="title" class="whitespace-nowrap">{text.heavy}</Headline>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.tween("thin", { wght: [null, 200] }, { at: 0.2, duration: "slow", ease: "out", kind: "emphasis" }); // weight-role + axis-reflow + property-motion
    m.tween("wide", { wdth: [100, 125] }, { at: 0.4, duration: "slow", ease: "out", kind: "emphasis" }); // axis-unsupported (Geist has no wdth)
    m.tween("heavy", { wght: [null, 950] }, { at: 0.6, duration: "slow", ease: "out", kind: "emphasis" }); // axis-range (Geist stops at 900)
  },
});
