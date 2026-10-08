import { scene, El, Card, Progress, Counter, Stat, Pill, Sheen } from "continuity";
import { Chapter, SURFACE } from "../lib/chapter.js";

// The five critique axes. UI data: the scorecard is imagery, not copy.
const AXES = [
  { label: "Intent", bar: 0.92, score: 4.6 },
  { label: "Composition", bar: 0.88, score: 4.4 },
  { label: "Typography", bar: 0.96, score: 4.8 },
  { label: "Temporal", bar: 0.9, score: 4.5 },
  { label: "Craft", bar: 0.94, score: 4.7 },
];
const MEAN = 4.6;

// Scorecard = the shared chapter surface (1728×600): left column ≈65% axes,
// hairline, right column mean + verdict.
const BAR_W = 640;

const fills = AXES.map((_, i) => `bar${i}-fill`);
const round = (t: number) => Math.round(t * 100) / 100;

export default scene({
  view: ({ text }) => (
    <Chapter eyebrow={text.eyebrow} headline={text.headline} sub={text.sub}>
      <Card ct="card" class="overflow-hidden" style={{ width: `${SURFACE.width}px`, height: `${SURFACE.height}px` }}>
        <div class="flex h-full">
          <El ct="axes" class="flex h-full flex-1 flex-col justify-between py-[14px] pl-[28px] pr-[64px]">
            {AXES.map((a, i) => (
              <El ct={`ax${i}`} class="grid grid-cols-[260px_auto_96px] items-center gap-[40px]">
                <span class="font-sans text-[30px] text-muted">{a.label}</span>
                <Progress ct={`bar${i}`} value={a.bar} width={BAR_W} />
                <Counter ct={`v${i}`} decimals={1} class="text-right font-mono text-[32px] text-fg" />
              </El>
            ))}
          </El>
          <div class="w-px self-stretch bg-border" />
          <div class="flex w-[480px] flex-col justify-center gap-[40px] pl-[64px]">
            <Stat ct="mean" value={MEAN} decimals={1} label="v3 · mean score" class="items-start" />
            <div class="flex">
              {/* the payoff: end-card CTA pill sizing, not the default chip */}
              <Pill ct="ships" dot="positive" class="h-[64px]! gap-[14px]! px-[30px]! text-[30px] text-fg">
                best of 3 · ships
              </Pill>
            </div>
          </div>
        </div>
        <Sheen ct="sheen" opacity={0.06} />
      </Card>
    </Chapter>
  ),
  motion: (m) => {
    // The scorecard (labels, empty tracks, 0.0 counters) is already on the surface
    // when the push brings it in; only the data moves. Times are raw seconds because
    // the push-in replaced the card entrance the storyboard beats were timed for.
    m.enter("eyebrow", "fade", { at: 0 });
    m.enter("headline", "maskUp", { at: 0.2, split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.25", distance: 24 });

    // Bars fill and scores count, each axis 80ms after the previous one
    m.tween(fills, { scaleX: [0, 1] }, { at: 0.6, duration: "slow", ease: "enter", stagger: "list", kind: "enter" });
    AXES.forEach((a, i) =>
      m.counter(`v${i}`, { from: 0, to: a.score, decimals: 1, at: round(0.6 + i * 0.08), duration: "hero" }),
    );
    m.counter("mean", { from: 0, to: MEAN, decimals: 1, at: 0.8, duration: "linger" });

    // b3 · the verdict: the mean thumps once it has landed, the pill pops, one quiet
    // sheen sweep that ends ≥ 0.5s before the dip so the verdict holds still.
    // (Storyboard asks for a `glow` on mean, but brightness on #f5f5f6 type is invisible → pulse.)
    m.emphasize("mean", "pulse", { at: "after:mean" });
    m.enter("ships", "scalePop", { at: "b3" });
    m.tween("sheen", { xPct: [-160, 360] }, { at: "b3+0.2", duration: "hero", ease: "inOut" });

    m.camera({ scale: [1, 1.025] });
  },
});
