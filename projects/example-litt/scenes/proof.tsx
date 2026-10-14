import { scene, Stage, Safe, Subhead, Stat } from "continuity";

/**
 * proof: three mono figures under one quiet line. The 0 is the point.
 * Lit precision: only transform + opacity move; backdrop, grain and light stay put.
 * Separation is a hairline over each column (no boxed cards). No accent fill, no glow.
 */
export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <div class="absolute inset-x-0 top-[275px] flex flex-col">
          <Subhead ct="lead" size="lead" class="text-muted">
            {text.lead}
          </Subhead>
          <div class="mt-[96px] grid grid-cols-3 gap-x-[48px]">
            <div class="border-t-2 border-border pt-[48px]">
              <Stat ct="axes" value={Number(text.axes)} label={text["axes-label"]} class="items-start [&>span:first-child]:text-muted [&>span:last-child]:text-subtle" />
            </div>
            <div class="border-t-2 border-border pt-[48px]">
              <Stat ct="fps" value={Number(text.fps)} label={text["fps-label"]} class="items-start [&>span:first-child]:text-muted [&>span:last-child]:text-subtle" />
            </div>
            <div class="border-t-2 border-border pt-[48px]">
              <Stat ct="errors" value={Number(text.errors)} label={text["errors-label"]} class="items-start" />
            </div>
          </div>
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m, { text }) => {
    // b1: the lead line rises (responsive tier: base, standard, 32px).
    m.enter("lead", "rise", { at: "b1", distance: 32, duration: "base", ease: "standard" });

    // b2: 5 and 30 rise one grid step apart and count up in mono.
    m.enter(["axes", "fps"], "rise", { at: "b2", stagger: "grid", distance: 32, duration: "base", ease: "standard" });
    // Counters ease with `standard` (not the default expo-out `hero`): the count has to tick while the
    // figure is still fading in, otherwise 5 would be settled before it is visible.
    m.counter("axes", { from: 0, to: Number(text.axes), at: "b2", duration: "slow", ease: "standard" });
    m.counter("fps", { from: 0, to: Number(text.fps), at: "b2+0.05", duration: "slow", ease: "standard" });
    m.enter(["axes-label", "fps-label"], "fade", { at: "b2+0.15", stagger: "grid", duration: "base", ease: "standard" });

    // b3: the 0 has nothing to count from, so it pops. The scene's one expressive moment.
    m.enter("errors", "scalePop", { at: "b3" });
    m.enter("errors-label", "fade", { at: "b3+0.2", duration: "base", ease: "standard" });
  },
});
