import { scene, Stage, Headline, Stack, Safe } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Stack gap={20}>
          <Headline ct="thin" size="h2">{text.thin}</Headline>
          <Headline ct="wide" size="h2">{text.wide}</Headline>
          <Headline ct="heavy" size="h2" class="whitespace-nowrap">{text.heavy}</Headline>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.tween("thin", { wght: [null, 200] }, { at: 0.2, duration: "slow", ease: "enter", kind: "emphasis" }); // hairline-weight + axis-reflow
    m.tween("wide", { wdth: [100, 125] }, { at: 0.4, duration: "slow", ease: "enter", kind: "emphasis" }); // axis-unsupported (Newsreader has no wdth)
    m.tween("heavy", { wght: [null, 900] }, { at: 0.6, duration: "slow", ease: "enter", kind: "emphasis" }); // axis-range (Newsreader stops at 800)
  },
});
