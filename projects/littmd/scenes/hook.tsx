import { scene, Stage, Safe, Headline, Emph, El } from "continuity";

/**
 * Cold open, on the solid canvas (no light yet). The one statement, a display
 * couplet on the safe left edge in the upper half; below it, the same generic
 * agent-built page four times over (shapes only: a centred headline bar, a pill
 * button, three equal cards) — "everyone's taste". The pages dim as "Not yours."
 * lands and sink out, so the statement ends alone with only "yours." in fg, the
 * word the reveal answers ("Your taste, written as rules.").
 */

// The row of thumbnails spans the title-safe width (1728): four 16:10 pages, 32 apart.
const THUMB_W = (1728 - 3 * 32) / 4; // 408
const THUMB_H = 256; // 16:10 on the 16px grid
const THUMBS = [0, 1, 2, 3].map((i) => `thumb${i}`);
// Each page's parts, so the four pages can build themselves the same way.
const PARTS = (part: string) => THUMBS.map((t) => `${t}-${part}`);

/** One generic page, drawn in shapes: fg at low opacity on a flat surface-1 card. */
function Page({ ct }: { ct: string }) {
  return (
    <El
      ct={ct}
      data-ct-ui
      class="relative shrink-0 rounded-surface bg-surface-1 shadow-raised"
      style={{ width: `${THUMB_W}px`, height: `${THUMB_H}px` }}
    >
      <div class="absolute inset-[32px] flex flex-col items-center">
        {/* The centred hero headline and its pill button. */}
        <El ct={`${ct}-head`} class="mt-[16px] h-[16px] w-[208px] rounded-full bg-fg/32" />
        <El ct={`${ct}-btn`} class="mt-[16px] h-[24px] w-[96px] rounded-full bg-fg/24" />
        {/* Three equal cards. */}
        <El ct={`${ct}-cards`} class="mt-auto flex w-full gap-[16px]">
          <div class="h-[88px] flex-1 rounded-control bg-fg/8" />
          <div class="h-[88px] flex-1 rounded-control bg-fg/8" />
          <div class="h-[88px] flex-1 rounded-control bg-fg/8" />
        </El>
      </div>
    </El>
  );
}

export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        {/* 160 between the statement and the pages, not the 96 region gap: before b2
            the words of l2 wait one line box (146) below their line, under their mask,
            and the pages must not sit over them. It also centres the frame's mass. */}
        <div class="absolute inset-x-0 top-[160px] flex flex-col items-start gap-[160px]">
          <Headline as="h1">
            <El as="span" ct="l1" class="block">
              {text.l1}
            </El>
            <El as="span" ct="l2" class="block">
              <Emph text={text.l2} word="yours.">
                {(w) => (
                  <El as="span" ct="yours" class="text-fg">
                    {w}
                  </El>
                )}
              </Emph>
            </El>
          </Headline>
          <El ct="thumbs" class="flex w-full gap-[32px]">
            {THUMBS.map((id) => (
              <Page ct={id} />
            ))}
          </El>
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1 — the claim rises word by word from behind its baseline (responsive).
    m.enter("l1", "maskUp", { at: "b1", split: "words" });
    // …and the agents build: four empty pages rise in a 40ms cascade, then each builds
    // itself the same way — headline, pill, three cards — the identical page four
    // times. The parts travel a quarter (8px): small UI inside its surface.
    m.enter(THUMBS, "rise", { at: "b1+0.1", stagger: "grid" });
    m.enter(PARTS("head"), "rise", { at: "b1+0.26", stagger: "grid", distance: 8 });
    m.enter(PARTS("btn"), "rise", { at: "b1+0.34", stagger: "grid", distance: 8 });
    m.enter(PARTS("cards"), "rise", { at: "b1+0.42", stagger: "grid", distance: 8 });

    // b2 — the turn, the scene's one expressive moment: line 1 and the pages step back
    // together (instant), and "Not yours." rises on the expressive spring.
    m.emphasize("l1", "dim", { at: "b2" });
    m.tween(THUMBS, { opacity: 0.35 }, { at: "b2", duration: "instant", ease: "out", stagger: 0 });
    m.enter("l2", "maskUp", { at: "b2", split: "words", ease: "expressive" });

    // b3 — everything but "yours." (pinned to fg) steps back, and the pages sink out
    // (0.75×, ease out) so the statement ends alone.
    m.emphasize("l2", "dim", { at: "b3" });
    m.exit(THUMBS, "dropOut", { at: "b3", stagger: "grid" });

    // The push holds the statement's left edge still, so the hard cut doesn't snap it.
    m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 540 } });
  },
});
