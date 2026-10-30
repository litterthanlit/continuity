import { scene, Stage, Safe, Stack, Headline } from "continuity";
import { LEFT, push } from "../lib/layout.js";

// The claim, one line per kick: each rises from behind its baseline on the steep ease (a masked
// wipe — the mask is padded, so the display line's ascenders are never clipped), and on the
// bar's last beat the setup line steps to the grey — rank by ink, on the beat.
export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Safe>
        <Stack gap={0} class="absolute top-[300px]" style={`left:${LEFT - 96}px`}>
          <Headline ct="l1" class="whitespace-nowrap">{text.l1}</Headline>
          <Headline ct="l2" class="whitespace-nowrap">{text.l2}</Headline>
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m, ctx) => {
    m.enter("l1", "maskUp", { at: "l1", split: "lines", duration: "snap", ease: "steep" });
    m.enter("l2", "maskUp", { at: "l2", split: "lines", duration: "snap", ease: "steep" });
    m.emphasize("l1", "dim", { at: "dim" });
    push(m, ctx, 420);
  },
});
