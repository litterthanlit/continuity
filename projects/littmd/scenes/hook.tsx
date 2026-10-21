import { scene, Stage, Safe, Headline, Emph, El } from "continuity";

/**
 * Cold open. Type only, on the solid canvas (no light yet): the scene's one
 * statement, a display couplet on the safe left edge. Each new line takes fg and
 * the one before steps back to the grey, until only "yours." keeps its ink —
 * the word the reveal answers ("Your taste, written as rules.").
 */
export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <div class="absolute inset-0 flex flex-col items-start justify-center">
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
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // b1: the claim rises word by word from behind its baseline.
    m.enter("l1", "maskUp", { at: "b1", split: "words" });
    // b2: the turn of the line — the scene's one expressive moment. Line 1 steps back.
    m.emphasize("l1", "dim", { at: "b2" });
    m.enter("l2", "maskUp", { at: "b2", split: "words", ease: "expressive" });
    // b3: everything but "yours." (pinned to fg) steps back to the grey.
    m.emphasize("l2", "dim", { at: "b3" });
    // The push holds the statement's left edge still, so the hard cut doesn't snap it.
    m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 540 } });
  },
});
