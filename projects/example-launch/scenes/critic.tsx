import { scene, El, Card, Meter, Counter, Stat, Tag, Caption } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 04 · Critique — the five-axis scorecard of this film's third iteration, beside the
// lockup. litt: a flat card, meters filled with fg (no hue: the axes are not
// categories that recur elsewhere), mono tabular scores, the mean as a Stat (label
// above value), the verdict as a status word.

// UI data: the scorecard is imagery, not copy.
const AXES = [
  { label: "Intent", bar: 0.92, score: 4.6 },
  { label: "Composition", bar: 0.88, score: 4.4 },
  { label: "Typography", bar: 0.96, score: 4.8 },
  { label: "Temporal", bar: 0.9, score: 4.5 },
  { label: "Craft", bar: 0.94, score: 4.7 },
];
const MEAN = 4.6;
const CARD_H = 600;
// 1024 − 2×48 padding − 224 label − 72 score − 2×40 gaps
const BAR_W = SPLIT.width - 96 - 224 - 72 - 80;

const fills = AXES.map((_, i) => `bar${i}-fill`);
const round = (t: number) => Math.round(t * 100) / 100;

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={CARD_H}>
      {/* One flat card: the five axes over a 2px hairline, then the mean and the verdict. */}
      <Card ct="card" class="flex flex-col" style={{ width: `${SPLIT.width}px`, height: `${CARD_H}px`, padding: "48px" }}>
        <El ct="axes" class="flex h-[312px] flex-col justify-between">
          {AXES.map((a, i) => (
            <El ct={`ax${i}`} class="grid grid-cols-[224px_auto_72px] items-center gap-[40px]">
              <El as="span" ct={`label${i}`} class="font-sans text-small text-fg-muted">
                {a.label}
              </El>
              <Meter ct={`bar${i}`} value={a.bar} width={BAR_W} />
              <Counter ct={`v${i}`} decimals={1} class="text-right font-mono text-small text-fg" />
            </El>
          ))}
        </El>
        <div class="my-[40px] h-[2px] bg-line" />
        <div class="flex items-end justify-between">
          <Stat ct="mean" value={MEAN} decimals={1} label="v3 · mean score" unit="/ 5" />
          <div class="flex items-center gap-[16px]">
            <Caption ct="best">best of 3 versions</Caption>
            <Tag ct="ships" tone="success">
              Ships
            </Tag>
          </div>
        </div>
      </Card>
    </Chapter>
  ),
  motion: (m) => {
    // The scorecard (labels, empty meters, 0.0 scores) is already on the surface when
    // the push brings it in; only the data moves.
    m.enter("headline", "maskUp", { at: "b1", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // b2 · the meters fill and their scores count with them (a chart drawing: slow, inOut).
    m.tween(fills, { scaleX: [0, 1] }, { at: "b2", duration: "slow", ease: "inOut", stagger: "list", kind: "enter" });
    AXES.forEach((a, i) =>
      m.counter(`v${i}`, { from: 0, to: a.score, decimals: 1, at: round(m.time("b2") + i * 0.04), duration: "slow", ease: "inOut" }),
    );
    m.counter("mean", { from: 0, to: MEAN, decimals: 1, at: "b2+0.2", duration: "linger" });

    // b3 · the verdict is placed: the scene's one moment.
    m.enter("ships", "settle", { at: "b3" });
    m.enter("best", "fade", { at: "b3+0.1" });

    m.camera({ scale: [1, 1.03] });
  },
});
