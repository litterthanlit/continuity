import { scene, Stage, Safe, Headline, Serif, Emph, El } from "continuity";

/**
 * Cold open. Type only, on solid black (the world before eyes): two h1 lines on
 * the safe left edge, vertically centered as one block. The only accent in the
 * frame is the caret after "motion." — the agent writing — and it is gone before
 * the second line, so "see" owns the frame when it loses focus.
 */
export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <div class="absolute inset-0 flex flex-col items-start justify-center pb-[1%]">
          <Headline ct="l1" size="h1">
            {text.l1}
            {/* Text caret: ≈6×110px, cap height to just below the baseline, like an editor's. */}
            <El
              as="span"
              ct="caret"
              data-layout-ignore
              class="ml-[14px] inline-block h-[110px] w-[6px] rounded-[1px] bg-accent"
              style="vertical-align:-0.17em"
            />
          </Headline>
          <Headline ct="l2" size="h1">
            <Emph text={text.l2} word="see">
              {/* +6px: the italic's lean closes the gap after "can't" (16px vs 21–25px elsewhere). */}
              {(w) => (
                <Serif ct="see" class="ml-[6px]">
                  {w}
                </Serif>
              )}
            </Emph>
          </Headline>
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1: the claim rises word by word from behind its baseline.
    m.enter("l1", "maskUp", { at: "b1", split: "words", stagger: "word" });

    // The caret arrives with the line, blinks once after it lands, and is gone
    // as the second line starts. The blink ends on a fully-on phase (x = 0.75 of
    // its period) exactly when the fade-out begins, so opacity never jumps.
    m.enter("caret", "fade", { at: "b1", duration: "fast" });
    m.blink("caret", { at: "b1+0.24", until: "b2-0.08", period: 0.64 });
    m.exit("caret", "fadeOut", { at: "b2-0.08" });

    // b2: the problem, same physics.
    m.enter("l2", "maskUp", { at: "b2", split: "words", stagger: "word" });

    // b3: "see" goes out of focus — the problem made visible. It stays soft into the dip.
    m.tween("see", { blur: [0, 8], opacity: [1, 0.45] }, { at: "b3", duration: "slow", ease: "standard", kind: "emphasis" });

    // Ambient: a slow push over the whole scene; nothing exits, the dip is the exit.
    // The camera scales about the frame centre, which would carry the left-aligned
    // type 35px past the safe edge by the end (864px × 4%). The matching x drift
    // anchors the push on the safe left edge: the type grows to the right instead.
    m.camera({ scale: [1, 1.04], x: [0, 35] });
  },
});
