import { scene, El, Window } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";
import { SCENES as ALL, FILM_S, FORMAT, fmtS } from "../lib/film.js";

// 01 · Plan — the storyboard of this very film: scenes on the left, their beat
// lanes on a shared seconds axis on the right. Data is real and cannot drift:
// durations, beat times, scene count and running time come from storyboard.json.
// litt: no colour on this surface. This scene's row is P12's raised segment and
// steps up to fg; its keyframes are fg, the others fg 55% (BarChart's rule).

const HERE = "plan";
const ROWS = 5;

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

// Five consecutive scenes around this one (hook…measure while plan is third).
const hereIdx = ALL.findIndex((s) => s.id === HERE);
const first = Math.max(0, Math.min(hereIdx - 2, ALL.length - ROWS));
const SCENES = ALL.slice(first, first + ROWS).map((s) => ({
  title: CAPTION[s.id] ? `${s.id} · ${CAPTION[s.id]}` : s.id,
  dur: s.duration,
  beats: s.beats.map((b) => b.at),
  current: s.id === HERE,
}));
const FOOTER_R = `${ALL.length} scenes · ${fmtS(FILM_S)}`;

// The product beside the lockup (litt's split frame): 1024 wide; rows on the List's 88px rhythm.
const WIN_W = SPLIT.width;
const WIN_H = 640;
const BODY_H = WIN_H - 64; // Window title bar
const HEAD_H = 64; // column header + time ruler
const ROW_H = 88;
const FOOT_H = BODY_H - HEAD_H - ROWS * ROW_H; // status bar (72)
const LEFT_W = 448; // scene list column
const TRACK_X = 40; // lane inset inside the lanes column
const TRACK_W = WIN_W - LEFT_W - 2 * TRACK_X; // the longest scene fills the track; the axis scales to fit
const MAX_DUR = Math.max(...SCENES.map((s) => s.dur));
const PX_PER_S = TRACK_W / MAX_DUR;
const SECONDS = Array.from({ length: Math.floor(MAX_DUR) + 1 }, (_, i) => i);

const TICKS = SCENES.flatMap((s, lane) => s.beats.map((t) => ({ lane, t })));
const TICK_IDS = TICKS.map((_, i) => `tick${i}`);
const LANE_IDS = SCENES.map((_, i) => `lane${i}`);
const CURRENT = SCENES.findIndex((s) => s.current);
const TICK = 20; // keyframe diamond, px

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={WIN_H}>
      <Window ct="board" title="storyboard.json" width={WIN_W} height={WIN_H}>
        <div class="relative h-full">
          {/* "You are here": the raised segment behind this scene's row (P12). */}
          <El
            ct="current"
            class="absolute left-[16px] right-[16px] rounded-control bg-surface-2 shadow-raised"
            style={{ top: `${HEAD_H + CURRENT * ROW_H + 8}px`, height: `${ROW_H - 16}px` }}
          />

          {/* Column header + time ruler */}
          <div class="relative flex border-b-2 border-line" style={{ height: `${HEAD_H}px` }}>
            <div
              class="flex items-center justify-between pl-[32px] pr-[32px] font-mono text-[26px] text-fg-subtle"
              style={{ width: `${LEFT_W}px` }}
            >
              <span>scene</span>
              <span>duration</span>
            </div>
            <div class="relative flex-1 border-l-2 border-line font-mono text-[26px] text-fg-subtle">
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
            {/* Scene rows: the List look (hairlines, title, mono meta), rebuilt at 80px
                so five rows and the status bar fit the shared surface. */}
            <div class="relative" style={{ width: `${LEFT_W}px` }}>
              {SCENES.map((s, i) => (
                <El
                  ct={`rows-r${i}`}
                  data-ct-ui
                  class="flex items-center gap-[24px] border-b-2 border-line pl-[32px] pr-[32px]"
                  style={{ height: `${ROW_H}px` }}
                >
                  <El as="span" ct={`title${i}`} class="font-sans text-[28px] text-fg-muted">
                    {s.title}
                  </El>
                  <span class="ml-auto font-mono text-[26px] text-fg-subtle">{fmtS(s.dur)}</span>
                </El>
              ))}
            </div>

            <El ct="lanes" class="relative flex-1 border-l-2 border-line">
              {/* a faint 1s grid behind the lanes */}
              {SECONDS.map((s) => (
                <div class="absolute inset-y-0 w-[2px] bg-fg/[0.04]" style={{ left: `${TRACK_X + s * PX_PER_S - 1}px` }} />
              ))}
              {SCENES.map((s, i) => (
                <div class="relative border-b-2 border-line" style={{ height: `${ROW_H}px` }}>
                  <El
                    ct={`lane${i}`}
                    class="absolute top-1/2 -mt-[4px] h-[8px] rounded-full bg-fg/12"
                    style={{ left: `${TRACK_X}px`, width: `${s.dur * PX_PER_S}px` }}
                  />
                </div>
              ))}
              {/* beat keyframes: siblings of the lanes so the lane wipe never clips them */}
              {TICKS.map((k, i) => (
                <El
                  ct={`tick${i}`}
                  class="absolute"
                  style={{
                    left: `${TRACK_X + k.t * PX_PER_S - TICK / 2}px`,
                    top: `${k.lane * ROW_H + ROW_H / 2 - TICK / 2}px`,
                    width: `${TICK}px`,
                    height: `${TICK}px`,
                  }}
                >
                  <div
                    class={`absolute inset-[3px] rotate-45 ${k.lane === CURRENT ? "bg-fg" : "bg-fg/55"}`}
                    // a 3px knockout in the surface colour, so a keyframe reads clear of its lane
                    style={{ boxShadow: "0 0 0 3px var(--color-surface-1)" }}
                  />
                </El>
              ))}
            </El>
          </div>

          {/* Status bar: the film's real format, mirrors the title bar */}
          <div
            class="absolute inset-x-0 bottom-0 flex items-center justify-between border-t-2 border-line px-[32px] font-mono text-[26px] text-fg-subtle"
            style={{ height: `${FOOT_H}px` }}
          >
            <span>{FORMAT}</span>
            <span>{FOOTER_R}</span>
          </div>
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // The push brings the board in: it is on screen from t=0, so the push never lands
    // on an empty frame. The statement is the scene's one expressive moment.
    m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    m.enter("sub", "rise", { at: "after:headline-0.25" });

    // The scene rows ride in with the push (the bench is never empty). Once it lands the
    // beat lanes wipe on along the time axis, then the real beats appear in reading
    // order, all landed by b2.
    m.enter(LANE_IDS, "wipeRight", { at: 0.6, stagger: "list" });
    m.enter(TICK_IDS, "fade", { at: 0.9, stagger: "list" });

    // b3 — "you are here": the raised segment comes up under this scene's row and its
    // title steps up to fg, at the instant tier.
    m.enter("current", "fade", { at: "b3" });
    m.emphasize(`title${CURRENT}`, "ink", { at: "b3" });

    m.camera({ scale: [1, 1.03] });
  },
});
