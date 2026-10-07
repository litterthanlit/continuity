import { scene, El, Window, List } from "continuity";
import { Chapter } from "../lib/chapter.js";

// 01 · Plan — the storyboard of this very film: scenes on the left, their beat
// lanes on a shared time axis on the right. Data is real: durations and beat
// times are copied from storyboard.json.

const SCENES = [
  { title: "hook · the problem", dur: 3.9, beats: [0.15, 0.95, 2.45] },
  { title: "studio · the turn", dur: 4.4, beats: [0.3, 1.6, 3.1] },
  { title: "plan · storyboard", dur: 4.8, beats: [0.3, 2.0, 3.3], current: true },
  { title: "check · eyes on frames", dur: 6.6, beats: [0.3, 1.3, 2.95, 4.45] },
  { title: "measure · motion chart", dur: 5.0, beats: [0.3, 1.5, 2.75] },
];

// Full title-safe width → symmetric margins on every chapter.
const WIN_W = 1728;
const WIN_H = 600;
const ROW_H = 78; // List row rhythm
const HEAD_H = 76; // column header + time ruler
const FOOT_H = WIN_H - 68 - HEAD_H - 5 * ROW_H; // status bar mirrors the title bar (66px)
const LEFT_W = 800; // scene list column
const TRACK_X = 66; // lane inset inside the lanes column (≈ same on the right)
const PX_PER_S = 120; // 6.6s (longest scene) → 792px track
const SECONDS = [0, 1, 2, 3, 4, 5, 6];

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
          {/* "You are here": the row of this scene, highlighted at b3. */}
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
                  <div class="absolute inset-[4px] rotate-45 rounded-[2px] bg-accent shadow-[0_0_0_3px_var(--color-surface)]" />
                </El>
              ))}
            </El>
          </div>

          {/* Status bar: the film's real format, mirrors the title bar */}
          <div
            class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-surface-2/70 px-[28px] font-mono text-[26px] text-subtle"
            style={{ height: `${FOOT_H}px` }}
          >
            <span>16:9 · 30 fps · mono-dark</span>
            <span>7 scenes · 31.0s</span>
          </div>
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // b1 — copy leads (same rhythm on every chapter), the storyboard rises and its tilt resolves.
    m.enter("eyebrow", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.1", split: "lines" });
    // "after:headline-0.25" in intent: the one-line headline lands at b1+1.0, the sub
    // follows 0.25s before (explicit, since after: counts the split span conservatively).
    m.enter("sub", "rise", { at: "b1+0.75", distance: 24 });
    m.enter("board", "rise", { at: "b1+0.25", distance: 96, duration: "hero" });
    m.tween("board", { rotateX: [10, 0] }, { at: "b1+0.25", duration: "hero", ease: "enter", kind: "enter" });
    m.enter(ROW_IDS, "rise", { at: "after:board-0.35", stagger: "list", distance: 18 });

    // b2 — the beat lanes wipe on along the time axis, then the 16 real beats land in
    // reading order. 0.04s (not the 0.05 grid token) so the last one settles by ≈3.1s,
    // before b3; every keyframe pops just behind its lane's wipe front, never ahead of it.
    m.enter(LANE_IDS, "wipeRight", { at: "b2", stagger: "list" });
    m.enter(TICK_IDS, "scalePop", { at: "b2+0.3", duration: "fast", stagger: 0.04 });

    // b3 — "you are here": this scene's row lights up, sweeping in reading direction.
    m.enter("current", "wipeRight", { at: "b3", duration: "base" });
    m.emphasize(`rows-r${CURRENT}`, "glow", { at: "b3+0.2" });

    // Ambient: one slow push over the whole scene (≈0.6%/s), handing off to the push transition.
    // 1.03 about the centre keeps the safe-edge copy and board inside action-safe.
    m.camera({ scale: [1, 1.03] });
  },
});
