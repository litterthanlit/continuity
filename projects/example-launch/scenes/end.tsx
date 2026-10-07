import { scene, Stage, Safe, Center, Stack, Headline, Subhead, Pill, Glow } from "continuity";

// End card — the film's only centered frame. Wordmark (display 168) over a muted
// lead tagline, then the "Open source" CTA pill (the "Ship" stop of the pipeline).
export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <Glow ct="glow" size={1300} x="50%" y="42%" opacity={0.3} />
      <Safe>
        <Center>
          <Stack gap={0} class="items-center">
            <Headline ct="wordmark" size="display" class="tracking-[-0.045em]">
              {text.wordmark}
            </Headline>
            <Subhead ct="tagline" size="lead" class="mt-[36px]">
              {text.tagline}
            </Subhead>
            {/* The CTA is the call to action, not a status chip: one step up from the
                kit pill (30px, fg label) so it holds its own under a 168px wordmark. */}
            <Pill ct="cta" dot="accent" class="mt-[60px] h-[64px]! gap-[14px]! px-[30px]! text-[30px] text-fg">
              {text.cta}
            </Pill>
          </Stack>
        </Center>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1 — the name resolves: tracking collapses from wide to the tight display setting
    // while the light behind it comes up.
    m.enter("wordmark", "trackIn", { at: "b1", tracking: -0.045 });
    m.enter("glow", "fade", { at: "b1", duration: "slow" });
    // b2 — the promise follows once the wordmark has mostly settled.
    m.enter("tagline", "rise", { at: "b2", distance: 24 });
    // b3 — the CTA pops (tactile chip → snappy spring), then the card holds > 2s.
    m.enter("cta", "scalePop", { at: "b3" });
    // Ambient life through the > 2s hold: the glow breathes from the moment it appears…
    m.loop("glow", { scale: 0.05 }, { period: 6, at: "b1" });
    // …and the camera creeps in. This is the film's last frame, so the push eases IN out of
    // the dip and then cruises at constant speed into the final frame (end slope = 1) instead
    // of braking to a dead stop. An inOut push measured as a dead zone over the last ~0.5s.
    m.camera({ scale: [1, 1.05] }, { ease: { type: "bezier", p: [0.33, 0, 0.67, 0.67] } });
  },
});
