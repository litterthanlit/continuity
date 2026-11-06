import { scene, Stage, Safe, Stack, Headline } from "continuity";
import { LEFT, push } from "../lib/layout.js";

// The claim, one line per kick: each rises from behind its baseline (a masked wipe, its mask
// padded so the ascenders are never clipped). The first starts the film, so it leaves fast (out);
// the second starts half its snap early, so its fastest frame is the kick. Both stay fg: over the
// aurora field the grey falls under 3:1 (docs/decisions/0011), so the bar holds on the push.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="aurora">
      <Safe>
        <Stack gap={0} class="absolute top-[300px]" style={`left:${LEFT - 96}px`}>
          <Headline ct="l1" class="whitespace-nowrap">{text.l1}</Headline>
          <Headline ct="l2" class="whitespace-nowrap">{text.l2}</Headline>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m, ctx) => {
    m.enter("l1", "maskUp", { at: "l1", split: "lines", duration: "snap", ease: "out" });
    m.enter("l2", "maskUp", { at: "l2-0.15", split: "lines", duration: "snap", ease: "steep" });
    push(m, ctx, 420);
  },
});
