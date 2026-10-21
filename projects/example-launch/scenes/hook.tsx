import { scene, Stage, Safe, Headline, Emph, El } from "continuity";

/**
 * Cold open. Type only, on the solid canvas (the world before eyes): the
 * scene's one statement, a display couplet on the safe left edge. Rank comes
 * from ink — each new line takes fg and the one before steps back to the grey,
 * until only "see" keeps its ink. The only accent is the focus caret after
 * "motion." (the agent typing), gone before the second line.
 */
export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <div class="absolute inset-0 flex flex-col items-start justify-center">
          <Headline as="h1">
            <El as="span" ct="l1" class="block">
              {text.l1}
              {/* A text caret, cap height to just below the baseline, like an editor's. */}
              <El
                as="span"
                ct="caret"
                data-layout-ignore
                class="ml-[16px] inline-block h-[96px] w-[6px] bg-focus"
                style="vertical-align:-0.14em"
              />
            </El>
            <El as="span" ct="l2" class="block">
              <Emph text={text.l2} word="see">
                {(w) => (
                  <El as="span" ct="see" class="text-fg">
                    {w}
                  </El>
                )}
              </Emph>
            </El>
          </Headline>
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1: the claim rises word by word from behind its baseline.
    m.enter("l1", "maskUp", { at: "b1", split: "words" });

    // The caret arrives with the line, blinks after it lands, and is gone as the
    // second line starts (the blink ends on a fully-on phase when the fade begins).
    m.enter("caret", "fade", { at: "b1" });
    m.blink("caret", { at: "b1+0.24", until: "b2-0.08", period: 0.64 });
    m.exit("caret", "fadeOut", { at: "b2-0.08", duration: "instant" });

    // b2: the problem — the scene's one expressive moment. Line 1 steps back to the grey.
    m.emphasize("l1", "dim", { at: "b2" });
    m.enter("l2", "maskUp", { at: "b2", split: "words", ease: "expressive" });

    // b3: everything but "see" (pinned to fg) steps back: the problem, picked out by ink.
    m.emphasize("l2", "dim", { at: "b3" });

    // The push holds the statement's left edge still (it grows to the right), so the
    // type never drifts off the safe edge and the cut into the turn doesn't snap it back.
    m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 540 } });
  },
});
