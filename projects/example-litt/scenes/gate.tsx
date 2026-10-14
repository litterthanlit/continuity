import { scene, Stage, Safe, Stack, El, Headline, Card, List, Pill } from "continuity";

// gate: "Every frame, checked." A findings card flips from red to green and resolves
// to a "0 errors" verdict pill. Lit precision: responsive rises (base, standard, 32px),
// instant dot flips, exactly one expressive moment (the verdict pill, scalePop).
// Backdrop `lit`, grain and camera never move; only transform and opacity animate.
// No accent fill and no shadow-glow here: the end card's button owns both.

// Layout constants (px, 1080p). Safe area is 1728 x 972 at (96, 54); one grid row = 162.
const ROW_H = 78; // List row height (kit)
const DOT = 18; // List status dot (kit): 18px ring, 3px border
const DOT_X = 28; // row padding-left (kit)
// Rows are `h-78 border-b` with items-center: the dot centres in the 77px content box.
const DOT_Y = (ROW_H - 1 - DOT) / 2;

export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        {/* Headline: high-left, rows 2-3 of the grid, clear of the hook's text band. top 242 (not
            the 258px card line) puts the cap top of "Every" on y=312, level with the card's top border. */}
        <Stack gap={0} class="absolute left-0 top-[242px]">
          <Headline ct="l1" size="h1" class="whitespace-nowrap">
            {text.l1}
          </Headline>
          <Headline ct="l2" size="h1" class="whitespace-nowrap">
            {text.l2}
          </Headline>
        </Stack>

        {/* Findings card: top-aligned with the headline, right edge on the safe edge. */}
        <El class="absolute right-0 top-[258px]">
          <Card ct="card" class="w-[840px]">
            <El class="relative">
              <List
                ct="findings"
                rows={[
                  { title: text.f0, meta: text.t0, status: "danger" },
                  { title: text.f1, meta: text.t1, status: "danger" },
                  { title: text.f2, meta: text.t2, status: "warning" },
                ]}
              />
              {/* State layers: a positive ring dot exactly over each status dot, opacity 0.
                  bg-surface masks the red/amber ring beneath so no fringe shows through. */}
              {[0, 1, 2].map((i) => (
                <El
                  ct={`ok${i}`}
                  class="pointer-events-none absolute rounded-full border-[3px] border-positive bg-surface"
                  style={`left:${DOT_X}px;top:${i * ROW_H + DOT_Y}px;width:${DOT}px;height:${DOT}px;opacity:0`}
                />
              ))}
            </El>
            {/* The verdict: enlarged on purpose, it is the payoff. A result, not an action.
                Machine output, so mono (the "0" is slashed and cannot read as an O). Flush with the
                hairlines; px/gap put its dot on the ring dots' axis and its text on the titles' edge.
                origin-left: the pop grows from the card's inner edge, so the alignment holds. */}
            <Pill ct="verdict" dot="positive" class="mt-[28px] h-[68px] origin-left gap-[23px] px-[30px] font-mono text-[32px] text-fg">
              {text.verdict}
            </Pill>
          </Card>
        </El>
      </Safe>
    </Stage>
  ),

  motion: (m) => {
    // b1 (0.3): headline words rise, responsive tier. l2 starts one stagger step after l1's
    // second word, so the three words cascade 60ms apart in reading order, landed ~0.82s.
    m.enter("l1", "rise", { at: "b1", split: "words", stagger: "word", distance: 32, duration: "base", ease: "standard" });
    m.enter("l2", "rise", { at: "b1+0.12", split: "words", stagger: "word", distance: 32, duration: "base", ease: "standard" });

    // b2 (0.6): the card rises; its rows fade in 0.2s later and land ~1.3s showing the
    // failing state. Nothing moves again until b3 (>= 1.0s of red held still: the read).
    m.enter("card", "rise", { at: "b2", distance: 32, duration: "base", ease: "standard" });
    m.enter(["findings-r0", "findings-r1", "findings-r2"], "fade", { at: "b2+0.2", duration: "base", ease: "standard", stagger: "grid" });

    // b3 (2.3): the fix. Three positive dots cross-fade in over the status dots, one after
    // another (instant tier, no colour channel: a state layer fades). Done by ~2.64s.
    m.enter(["ok0", "ok1", "ok2"], "fade", { at: "b3", duration: "fast", ease: "standard", stagger: "grid" });

    // b4 (2.7): the verdict pops. The scene's ONE expressive moment (snappy at slow),
    // landed ~3.34s, then ~0.95s of stillness before the cut.
    m.enter("verdict", "scalePop", { at: "b4" });
  },
});
