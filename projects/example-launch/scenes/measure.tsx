import { scene, El, Window, Tag } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";
import { FILM_S, STARTS } from "../lib/film.js";

// 03 · Measure — the motion-energy curve of THIS film wipes on under a playhead,
// then three verdicts. Peaks sit just after each cut (pushes, entrances),
// shoulders on mid-scene beats, valleys on holds; never flat. litt: the line is
// fg (data in its own ink, no area, no gradient); the playhead is the timeline's
// caret, in the focus colour; the verdicts are status words.

const FILM = FILM_S;

/**
 * Energy shape per scene: [offset s, 0..1]. A positive offset is from the scene's start;
 * a negative one is seconds before the next cut (the hold before it).
 */
const SHAPE: Record<string, [number, number][]> = {
  hook: [[0, 0.1], [0.7, 0.62] /* words rise */, [1.3, 0.55] /* line 2 */, [-0.4, 0.15] /* hold → cut */],
  studio: [[0.5, 0.8] /* the statement */, [1.9, 0.55] /* rail + stations */, [-0.5, 0.2]],
  plan: [[0.6, 0.84] /* push + headline */, [1.6, 0.5] /* lanes + keyframes */, [-0.6, 0.18]],
  check: [[0.6, 0.84] /* sheet + frames */, [2.6, 0.42] /* findings, hold the red */, [4.9, 0.92] /* the fix: the punch */, [-0.4, 0.2]],
  measure: [[0.6, 0.82] /* push + headline */, [2.5, 0.48] /* verdicts */, [-0.7, 0.18]],
  critic: [[0.6, 0.8] /* scorecard */, [1.3, 0.55] /* meters fill */, [2.9, 0.46] /* verdict */, [-0.4, 0.16] /* hold → dip */],
  end: [[0.6, 0.76] /* wordmark */, [1.7, 0.44] /* button */, [3.0, 0.15] /* held end card */],
};

/** Motion energy over the film: [seconds, 0..1], strictly increasing in time. */
const ENERGY: [number, number][] = STARTS.flatMap(([id, start], i) => {
  const next = i + 1 < STARTS.length ? STARTS[i + 1][1] : FILM;
  return (SHAPE[id] ?? []).map(([o, v]): [number, number] => [o < 0 ? next + o : start + o, v]);
});
ENERGY.push([FILM, 0.12]);
for (let i = 1; i < ENERGY.length; i++) {
  if (!(ENERGY[i][0] > ENERGY[i - 1][0])) throw new Error(`measure: energy keyframes out of order at ${ENERGY[i][0]}s`);
}

// The product beside the lockup (litt's split frame).
const WIN_W = SPLIT.width; // 1024
const WIN_H = 600;
const PAD_X = 40; // plot + verdict row inset inside the window body
const CHART_W = WIN_W - PAD_X * 2; // the playhead travels exactly this
const CHART_H = 290;
const CHART_TOP = 56; // plot top inside the body (room for the playhead knob)
const STROKE = 4;
const BLEED = 3; // ≥ round-cap radius, so the caps aren't cut

const px = (t: number) => (t / FILM) * CHART_W;
const py = (v: number) => CHART_H - 10 - v * (CHART_H - 20);

/**
 * Smooth path through the points: Catmull-Rom tangents as cubic `C` segments, with
 * extrema flattened and slopes limited (Fritsch–Carlson) so peaks land exactly on
 * their beats, nothing overshoots, and x only moves forward (the wipe stays honest).
 */
function smooth(pts: [number, number][]): string {
  const n = pts.length;
  const slope = pts.slice(0, -1).map(([x, y], i) => (pts[i + 1][1] - y) / (pts[i + 1][0] - x));
  const tan = pts.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    if (slope[i - 1] * slope[i] <= 0) return 0;
    const t = (pts[i + 1][1] - pts[i - 1][1]) / (pts[i + 1][0] - pts[i - 1][0]);
    const k = Math.min(1, 3 / Math.max(t / slope[i - 1], t / slope[i]));
    return t * k;
  });
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = (x1 - x0) / 3;
    d += ` C${f(x0 + h)} ${f(y0 + tan[i] * h)} ${f(x1 - h)} ${f(y1 - tan[i + 1] * h)} ${f(x1)} ${f(y1)}`;
  }
  return d;
}

const LINE = smooth(ENERGY.map(([t, v]) => [px(t), py(v)]));

export default scene({
  view: ({ text, id }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={WIN_H}>
      <Window ct="chart" title="ct motion · launch.mp4" width={WIN_W} height={WIN_H}>
        <div class="flex h-full flex-col">
          {/* plot region */}
          <div class="relative flex-1" style={{ paddingTop: `${CHART_TOP}px`, paddingLeft: `${PAD_X}px`, paddingRight: `${PAD_X}px` }}>
            <div class="relative" style={{ width: `${CHART_W}px`, height: `${CHART_H}px` }}>
              {/* a quiet instrument grid and the baseline */}
              {[1 / 3, 2 / 3].map((f) => (
                <div data-layout-ignore class="absolute inset-x-0 h-[2px] bg-fg/[0.04]" style={{ top: `${f * CHART_H}px` }} />
              ))}
              <div data-layout-ignore class="absolute inset-x-0 bottom-0 h-[2px] bg-line-strong" />
              {/* time axis: a cut marker + label per scene; this scene's label in fg */}
              <div data-layout-ignore class="absolute inset-0">
                {STARTS.map(([name, t]) => (
                  <>
                    <div class="absolute top-0 w-[2px] bg-fg/[0.06]" style={{ left: `${px(t)}px`, height: `${CHART_H + 44}px` }} />
                    <span
                      class={`absolute font-mono text-[26px] leading-none ${name === id ? "text-fg" : "text-fg-subtle"}`}
                      style={{ left: `${px(t) + 8}px`, top: `${CHART_H + 18}px` }}
                    >
                      {name}
                    </span>
                  </>
                ))}
              </div>
              {/* the line, revealed by a wipe that IS the playhead's move */}
              <El ct="plot" data-layout-ignore class="absolute" style={{ left: `${-BLEED}px`, right: `${-BLEED}px`, top: "-12px", bottom: "-12px" }}>
                <svg
                  data-ct={`${id}.energy`}
                  class="absolute block overflow-visible"
                  style={{ left: `${BLEED}px`, top: "12px" }}
                  width={CHART_W}
                  height={CHART_H}
                  viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                  fill="none"
                >
                  <path d={LINE} stroke="var(--color-fg)" stroke-width={STROKE} stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </El>
              {/* playhead: a 2px line in the focus colour with a knob, starting on the plot's left edge */}
              <El ct="head" data-layout-ignore class="absolute bottom-[-8px] top-[-16px] w-[2px]" style={{ left: "-1px" }}>
                <div class="absolute inset-0 bg-focus" />
                <div class="absolute left-1/2 top-0 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-focus" />
              </El>
            </div>
          </div>
          {/* verdict row: status as words */}
          <div class="flex h-[96px] shrink-0 items-center gap-[16px] border-t-2 border-line" style={{ paddingLeft: `${PAD_X}px`, paddingRight: `${PAD_X}px` }}>
            <Tag ct="eased" tone="success">
              100% eased
            </Tag>
            <Tag ct="dead" tone="success">
              0 dead zones
            </Tag>
            <Tag ct="jolts" tone="success">
              0 jolts
            </Tag>
          </div>
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // b1 (0.0) — the push carries the chart window in (no entrance of its own); copy leads.
    m.enter("headline", "maskUp", { at: "b1+0.2", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // b2 — the playhead pulls the line: same start, duration and ease; it travels the plot width.
    // A left→right wipe (not `draw`, which advances by arc length and lags the head) keeps the
    // tip exactly under the playhead.
    m.enter("plot", "wipeRight", { at: "b2", duration: "linger", ease: "inOut" });
    m.tween("head", { x: [0, CHART_W] }, { at: "b2", duration: "linger", ease: "inOut" });

    // b3 — the verdict, placed in reading order as the playhead lands: the scene's one moment.
    m.enter(["eased", "dead", "jolts"], "settle", { at: "b3", stagger: "list" });

    m.camera({ scale: [1, 1.03] });
  },
});
