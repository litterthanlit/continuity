import { scene, El, Window, Pill } from "continuity";
import { Chapter, SURFACE } from "../lib/chapter.js";

// 03 · Measure — the motion-energy curve of THIS film (31s, 7 scenes) wipes on under
// a playhead, then three green verdict pills. Peaks sit just after each cut (pushes,
// entrances), shoulders on mid-scene beats, valleys on holds; never flat.

/** The film's scenes and where each starts (s) — the chart's time axis. */
const FILM = 31;
const SCENES: [string, number][] = [
  ["hook", 0],
  ["studio", 3.4],
  ["plan", 7.3],
  ["check", 11.6],
  ["measure", 17.7],
  ["critic", 22.2],
  ["end", 26.8],
];

/** Motion energy over the film: [seconds, 0..1]. */
const ENERGY: [number, number][] = [
  [0, 0.1],
  [0.8, 0.64], // hook: words rise
  [2.5, 0.42], // "see" blurs
  [3.2, 0.17], // hold → dip
  [4.0, 0.8], // studio: headline
  [5.3, 0.55], // rail draws, pills pop
  [6.8, 0.2], // hold
  [7.9, 0.84], // plan: window rises
  [9.5, 0.5], // lanes + ticks
  [11.0, 0.18], // hold
  [12.2, 0.84], // check: sheet + frames
  [14.2, 0.42], // terminal types, red findings hold
  [16.2, 0.92], // the fix — the film's punch
  [17.3, 0.2], // hold
  [18.3, 0.82], // measure: curve draws
  [20.0, 0.48], // verdict pills
  [21.5, 0.18], // hold
  [22.8, 0.8], // critic: scorecard
  [24.2, 0.55], // bars fill
  [25.4, 0.46], // verdict
  [26.4, 0.16], // hold → dip
  [27.4, 0.76], // end: wordmark
  [28.4, 0.44], // CTA
  [29.8, 0.15], // held end card
  [31, 0.12],
];

// The shared chapter surface: full title-safe width, same top edge in every chapter.
const WIN_W = SURFACE.width; // 1728
const WIN_H = SURFACE.height; // 600 → body 530 = chart region 434 + footer 96
const PAD_X = 56; // chart + pill row inset inside the window body
const CHART_W = WIN_W - 2 - PAD_X * 2; // 1px borders → 1614: the playhead travels exactly this
const CHART_H = 300;
const CHART_TOP = 54; // chart top inside the body (room for the playhead knob)
const STROKE = 4;
const BLEED = 3; // ≥ round-cap radius, so the caps aren't cut (≤ 3px off the head)

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
const AREA = `${LINE} L${CHART_W} ${CHART_H} L0 ${CHART_H} Z`;

export default scene({
  view: ({ text, id }) => (
    <Chapter eyebrow={text.eyebrow} headline={text.headline} sub={text.sub}>
      <Window ct="chart" title="ct motion · launch.mp4" width={WIN_W} height={WIN_H}>
        <div class="flex h-full flex-col">
          {/* chart region */}
          <div class="relative flex-1" style={{ paddingTop: `${CHART_TOP}px`, paddingLeft: `${PAD_X}px`, paddingRight: `${PAD_X}px` }}>
            <div class="relative" style={{ width: `${CHART_W}px`, height: `${CHART_H}px` }}>
              {/* quiet instrument grid */}
              {[1 / 3, 2 / 3].map((f) => (
                <div data-layout-ignore class="absolute inset-x-0 h-px bg-fg/[0.05]" style={{ top: `${f * CHART_H}px` }} />
              ))}
              <div data-layout-ignore class="absolute inset-x-0 bottom-0 h-px bg-border" />
              {/* time axis: a cut marker + label per scene (axis decoration, mono 22px) */}
              <div data-layout-ignore class="absolute inset-0">
                {SCENES.map(([name, t]) => (
                  <>
                    <div class="absolute top-0 w-px bg-fg/[0.07]" style={{ left: `${px(t)}px`, height: `${CHART_H + 40}px` }} />
                    <span
                      class={`absolute font-mono text-[22px] leading-none tracking-[0.04em] ${name === id ? "text-muted" : "text-subtle"}`}
                      style={{ left: `${px(t) + 10}px`, top: `${CHART_H + 16}px` }}
                    >
                      {name}
                    </span>
                  </>
                ))}
              </div>
              {/* plot = line + fill, revealed by a wipe that IS the playhead's move */}
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
                  <defs>
                    <linearGradient id="g-measure-energy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="var(--color-accent)" stop-opacity="0.32" />
                      <stop offset="1" stop-color="var(--color-accent)" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <path data-ct={`${id}.energy-area`} d={AREA} fill="url(#g-measure-energy)" />
                  <path data-ct={`${id}.energy-line`} d={LINE} stroke="var(--color-accent)" stroke-width={STROKE} stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </El>
              {/* playhead: 2px accent line with a knob, starts on the chart's left edge */}
              <El ct="head" data-layout-ignore class="absolute bottom-[-10px] top-[-16px] w-[2px]" style={{ left: "-1px" }}>
                <div class="absolute inset-0 bg-accent" style={{ boxShadow: "0 0 18px color-mix(in oklab, var(--color-accent) 70%, transparent)" }} />
                <div class="absolute left-1/2 top-0 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
              </El>
            </div>
          </div>
          {/* verdict row */}
          <div class="flex h-[96px] shrink-0 items-center gap-[16px] border-t border-border" style={{ paddingLeft: `${PAD_X}px`, paddingRight: `${PAD_X}px` }}>
            <Pill ct="eased" dot="positive">100% eased</Pill>
            <Pill ct="dead" dot="positive">0 dead zones</Pill>
            <Pill ct="jolts" dot="positive">0 jolts</Pill>
          </div>
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // b1 (0.0) — the push carries the chart window in (no entrance of its own); copy leads.
    m.enter("eyebrow", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.2", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.25", distance: 24 });

    // b2 — the playhead pulls the line: same start, duration and ease; it travels the chart width.
    // A left→right wipe (not `draw`, which advances by arc length and lags the head) keeps the
    // tip and the fill exactly under the playhead.
    m.enter("plot", "wipeRight", { at: "b2", duration: "linger", ease: "inOut" });
    m.tween("head", { x: [0, CHART_W] }, { at: "b2", duration: "linger", ease: "inOut" });
    m.enter("energy-area", "fade", { at: "b2+0.8", duration: "slow" });

    // b3 — the verdict, in reading order, as the playhead lands.
    m.enter(["eased", "dead", "jolts"], "scalePop", { at: "b3", stagger: "list" });

    m.camera({ scale: [1, 1.03] });
  },
});
