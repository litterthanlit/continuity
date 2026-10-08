import { scene, El, Window, List } from "continuity";
import { Chapter, SURFACE } from "../lib/chapter.js";
import storyboard from "../storyboard.json" with { type: "json" };

// 01 · Plan — the storyboard of this very film: scenes on the left, their beat
// lanes on a shared time axis on the right. Data is real and cannot drift:
// durations, beat times, scene count and running time are read from storyboard.json.

const HERE = "plan"; // this scene's id: its row is the "you are here" row
const ROWS = 5; // ≤ 5 rows per surface (treatment)

// Row captions (labels, not data). Unknown ids fall back to the bare id.
const CAPTION: Record<string, string> = {
  hook: "the problem",
  studio: "the turn",
  plan: "storyboard",
  check: "eyes on frames",
  measure: "motion chart",
  critic: "the score",
  end: "the card",
};

const ALL = storyboard.scenes;
// Five consecutive scenes around this one (hook…measure while plan is third).
const hereIdx = ALL.findIndex((s) => s.id === HERE);
const first = Math.max(0, Math.min(hereIdx - 2, ALL.length - ROWS));
const SCENES = ALL.slice(first, first + ROWS).map((s) => ({
  title: CAPTION[s.id] ? `${s.id} · ${CAPTION[s.id]}` : s.id,
  dur: s.duration,
  beats: s.beats.map((b) => b.at),
  current: s.id === HERE,
}));

// Running time: each scene starts when the previous one's outgoing transition begins.
const TOTAL = ALL.reduce(
  (acc, s, i) => (i === ALL.length - 1 ? acc + s.duration : acc + s.duration - (s.transition?.duration ?? 0)),
  0,
);
const FOOTER_L = `${storyboard.format.aspect} · ${storyboard.format.fps} fps · ${storyboard.theme}`;
const FOOTER_R = `${ALL.length} scenes · ${TOTAL.toFixed(1)}s`;

// The shared chapter surface: full title-safe width, fixed height.
const WIN_W = SURFACE.width;
const WIN_H = SURFACE.height;
const ROW_H = 78; // List row rhythm
const HEAD_H = 76; // column header + time ruler
const FOOT_H = WIN_H - 68 - HEAD_H - ROWS * ROW_H; // status bar mirrors the title bar (66px)
const LEFT_W = 800; // scene list column
const TRACK_X = 66; // lane inset inside the lanes column (≈ same on the right)
const TRACK_W = 792; // the longest scene fills the track; the time axis scales to fit
const MAX_DUR = Math.max(...SCENES.map((s) => s.dur));
const PX_PER_S = TRACK_W / MAX_DUR;
const SECONDS = Array.from({ length: Math.floor(MAX_DUR) + 1 }, (_, i) => i);

const TICKS = SCENES.flatMap((s, lane) => s.beats.map((t) => ({ lane, t })));
const TICK_IDS = TICKS.map((_, i) => `tick${i}`);
const LANE_IDS = SCENES.map((_, i) => `lane${i}`);
const ROW_IDS = SCENES.map((_, i) => `rows-r${i}`);
const CURRENT = SCENES.findIndex((s) => s.current);

export default scene({
  view: ({ text }) => (
    <Chapter eyebrow={text.eyebrow} headline={text.headline} sub={text.sub}>
      <Window ct="board" title="storyboard.json" width={WIN_W} height={WIN_H}>
        <div class="relative h-full">
          {/* "You are here": the row of this scene, highlighted after the beats land. */}
          <El
            ct="current"
            class="absolute left-0 right-0 bg-accent/[0.09]"
            style={{ top: `${HEAD_H + CURRENT * ROW_H}px`, height: `${ROW_H}px` }}
          >
            <div class="absolute inset-y-0 left-0 w-[4px] bg-accent" />
          </El>

          {/* Column header + time ruler */}
          <div class="relative flex border-b border-border" style={{ height: `${HEAD_H}px` }}>
            <div
              class="flex items-center justify-between pl-[66px] pr-[28px] font-mono text-[26px] text-subtle"
              style={{ width: `${LEFT_W}px` }}
            >
              <span>scene</span>
              <span>duration</span>
            </div>
            <div class="relative flex-1 border-l border-border font-mono text-[26px] text-subtle">
              {SECONDS.filter((s) => s % 2 === 0).map((s) => (
                <span
                  class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${TRACK_X + s * PX_PER_S}px` }}
                >
                  {s}s
                </span>
              ))}
            </div>
          </div>

          <div class="relative flex">
            <div class="relative" style={{ width: `${LEFT_W}px` }}>
              <List
                ct="rows"
                rows={SCENES.map((s) => ({
                  title: s.title,
                  meta: `${s.dur.toFixed(1)}s`,
                  status: s.current ? ("accent" as const) : undefined,
                }))}
              />
            </div>

            <El ct="lanes" class="relative flex-1 border-l border-border">
              {/* faint 1s grid behind the lanes */}
              {SECONDS.map((s) => (
                <div
                  class="absolute inset-y-0 w-px bg-fg/[0.05]"
                  style={{ left: `${TRACK_X + s * PX_PER_S}px` }}
                />
              ))}
              {SCENES.map((s, i) => (
                <div class="relative border-b border-border" style={{ height: `${ROW_H}px` }}>
                  <El
                    ct={`lane${i}`}
                    class="absolute top-1/2 h-[6px] -mt-[3px] rounded-full bg-fg/[0.18]"
                    style={{ left: `${TRACK_X}px`, width: `${s.dur * PX_PER_S}px` }}
                  />
                </div>
              ))}
              {/* beat keyframes: siblings of the lanes so the lane wipe never clips them */}
              {TICKS.map((k, i) => (
                <El
                  ct={`tick${i}`}
                  class="absolute h-[22px] w-[22px]"
                  style={{
                    left: `${TRACK_X + k.t * PX_PER_S - 11}px`,
                    top: `${k.lane * ROW_H + ROW_H / 2 - 11}px`,
                  }}
                >
                  {/* accent only on this scene's lane, so the "you are here" row owns the colour */}
                  <div
                    class={`absolute inset-[4px] rotate-45 rounded-[2px] shadow-[0_0_0_3px_var(--color-surface)] ${
                      k.lane === CURRENT ? "bg-accent" : "bg-fg/40"
                    }`}
                  />
                </El>
              ))}
            </El>
          </div>

          {/* Status bar: the film's real format, mirrors the title bar */}
          <div
            class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-surface-2/70 px-[28px] font-mono text-[26px] text-subtle"
            style={{ height: `${FOOT_H}px` }}
          >
            <span>{FOOTER_L}</span>
            <span>{FOOTER_R}</span>
          </div>
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // The push transition brings the board in: it is on screen from t=0, so the push never
    // lands on an empty grid. The eyebrow rides in with it (no entrance of its own).
    m.enter("headline", "maskUp", { at: 0.2, split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.25", distance: 24 });

    // Content loads while the copy lands: rows, then the beat lanes wipe on along the time
    // axis, then the 16 real beats pop in reading order and land on b2 (≈2.0s). 0.04s (not
    // the 0.05 grid token) keeps the cascade tight; with a 0.3s lag behind the lane wipe
    // every keyframe pops just behind its lane's wipe front, never ahead of it.
    m.enter(ROW_IDS, "rise", { at: 0.5, stagger: "list", distance: 18 });
    m.enter(LANE_IDS, "wipeRight", { at: 0.9, stagger: "list" });
    m.enter(TICK_IDS, "scalePop", { at: 1.2, duration: "fast", stagger: 0.04 });

    // "You are here": this scene's row lights up, sweeping in reading direction, a breath
    // after the beats land (b2+0.5, pulled ahead of b3 so the settled board holds ≈1.4s).
    m.enter("current", "wipeRight", { at: "b2+0.5", duration: "base" });
    m.emphasize(`rows-r${CURRENT}`, "glow", { at: "b2+0.7" });

    // Ambient: one slow push over the whole scene (≈0.6%/s), handing off to the push transition.
    // 1.03 about the centre keeps the safe-edge copy and board inside action-safe.
    m.camera({ scale: [1, 1.03] });
  },
});
