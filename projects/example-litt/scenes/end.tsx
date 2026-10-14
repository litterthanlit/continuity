import { scene, Stage, Safe, Center, Stack, Row, El, Headline, Subhead, Button } from "continuity";

// End card — the film's only centred frame. Wordmark (display 168, fg) over a muted
// lead tagline (48, 3.5x down), then ONE row: the primary action beside the command
// that does it. Hierarchy is size first, then fg -> muted; one weight, nothing picked out.
//
// Material never moves: the `lit` backdrop, grain and the Button's shadow-glow are static.
// The glow (bg-accent + shadow-glow) is the film's only accent fill; the chip beside it is
// surface-2 + hairline + fg text, with an fg caret, so the light falls on one thing.
export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <Center>
          {/* pb-[24px] lifts the block 12px: optical centre sits a touch above geometric centre. */}
          <Stack gap={0} class="items-center pb-[24px]">
            <Headline ct="wordmark" size="display">
              {text.wordmark}
            </Headline>
            <Subhead ct="tagline" size="lead" class="mt-[28px]">
              {text.tagline}
            </Subhead>
            {/* [cta | cmd] is one unit, 76px high, 24px gap, centred as a whole. */}
            <Row gap={24} class="mt-[88px]">
              <Button ct="cta" variant="primary" class="shadow-glow">
                {text.cta}
              </Button>
              <El
                ct="cmd"
                data-ct-ui
                class="flex h-[76px] items-center rounded-control border border-border bg-surface-2 px-[32px] font-mono text-caption text-fg"
              >
                <El as="span" ct="cmd-text">
                  {text.cmd}
                </El>
                {/* The caret is fg, not accent: the Button holds the only accent. */}
                <El as="span" ct="cmd-caret" data-layout-ignore class="ml-[4px] inline-block h-[36px] w-[3px] bg-fg" />
              </El>
            </Row>
          </Stack>
        </Center>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // Lit precision. The `dip` into this scene clears at 0.4s, so the first move is b1 (0.4).
    // b1/b2 — responsive tier: wordmark, then tagline 0.3s behind it (lead -> follow), 32px rise.
    m.enter("wordmark", "rise", { at: "b1", distance: 32, duration: "base", ease: "standard" });
    m.enter("tagline", "rise", { at: "b2", distance: 32, duration: "base", ease: "standard" });
    // b3 — the scene's ONE expressive moment (snappy at slow): the primary action. Only the
    // Button's transform and opacity animate; its shadow-glow is static paint that rides along.
    m.enter("cta", "scalePop", { at: "b3" });
    // b4 — the command chip fades in beside it and types (9 glyphs, last one lands 1.81s);
    // the caret appears with that last glyph (so it never sits ahead of the text), then blinks
    // until the final 0.3s so the film ends on a solid caret. Everything has landed by 1.93s,
    // which leaves a 1.57s hold with only the caret alive: ambient life from content.
    m.enter("cmd", "fade", { at: "b4", duration: "base", ease: "standard" });
    m.type("cmd-text", { at: 1.5, cps: 26 });
    m.enter("cmd-caret", "fade", { at: 1.81, duration: "instant", ease: "standard" });
    m.blink("cmd-caret", { at: 1.95, until: "end-0.3" });
  },
});
