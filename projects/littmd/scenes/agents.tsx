import { scene, El, Window, Tag } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 05 · Agent test — Claude builds a settings dialog in a fresh Vite app, and litt's
// own checks grade it (evals/agents/README.md). The run is the product acting: a raised
// segment (P12) walks down the six checks in the order the harness runs them; the row it
// sits on steps up from the grey to fg, and as it moves on that row's success Tag lands
// and the tally in the footer counts. Then the segment leaves and the verdict steps up.
// Status is a word (P11); no colour beyond the six "pass" words.

// UI data: the harness's checks, verbatim.
const CHECKS = ["Skill loaded", "Registry components", "Host lint", "Typecheck", "Build", "Screenshots"];
const TASK = "settings-dialog · vite";

// The shared split frame: 1024 wide; the title bar, six rows on the List's 88px rhythm
// and an 80px status bar = 672 (on the 16px grid), well inside the 972px safe height.
const WIN_W = SPLIT.width;
const TITLE_H = 64; // the Window's title bar
const ROW_H = 88;
const FOOT_H = 80;
const WIN_H = TITLE_H + CHECKS.length * ROW_H + FOOT_H; // 672
const LAST = CHECKS.length - 1;

const TAGS = CHECKS.map((_, i) => `tag${i}`);
const TITLES = CHECKS.map((_, i) => `checks-t${i}`);
const round = (t: number) => Math.round(t * 100) / 100;

// The walk: the segment lands on row 0 at b2, holds it 0.4s, then glides one row every
// 0.4s. The responsive spring settles in ~0.35s, so each glide lands and rests ~50ms
// before the next one starts (no settle-interrupted). The last row is held until b3.
const DWELL = 0.4;

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={WIN_H}>
      <Window ct="run" title="test:agents · settings-dialog" width={WIN_W} height={WIN_H}>
        <div class="relative h-full">
          {/* The raised segment (P12) on the row being checked, inset 16 / 8 like the
              reveal's; it starts on row 0 and moves by y only. */}
          <El
            ct="scan"
            class="absolute left-[16px] right-[16px] rounded-control bg-surface-2 shadow-raised"
            style={{ top: "8px", height: `${ROW_H - 16}px` }}
          />

          {/* The checks: the List look (title, hairline), with the status slot on the
              right. Titles wait in the grey; a checked row is fg. */}
          <El ct="checks" data-ct-ui class="relative flex flex-col">
            {CHECKS.map((title, i) => (
              <El
                ct={`checks-r${i}`}
                class="flex items-center gap-[24px] border-b-2 border-line pl-[32px] pr-[32px]"
                style={{ height: `${ROW_H}px` }}
              >
                <El as="span" ct={TITLES[i]} class="font-sans text-[28px] text-fg-muted">
                  {title}
                </El>
                <Tag ct={TAGS[i]} tone="success" class="ml-auto">
                  pass
                </Tag>
              </El>
            ))}
          </El>

          {/* Status bar: the task and the tally, mirrors the title bar. */}
          <div
            class="absolute inset-x-0 bottom-0 flex items-center justify-between px-[32px] font-mono text-[26px] text-fg-subtle"
            style={{ height: `${FOOT_H}px` }}
          >
            <span>{TASK}</span>
            <El as="span" ct="verdict">
              <El as="span" ct="passed">
                6
              </El>{" "}
              of {CHECKS.length} passed
            </El>
          </div>
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // The push brings the run in with its rows (present from t=0, titles in the grey,
    // the status slots empty and the tally at 0), so it never lands on an empty frame.
    // b1 · the label leads, the statement lands on the expressive spring (the scene's one
    // moment), the summary follows once it has landed.
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.04", split: "lines", ease: "expressive" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // b2 · the checks run. The segment comes up on row 0 and its title steps up to fg.
    const b2 = m.time("b2");
    m.enter("scan", "fade", { at: b2 });
    m.emphasize(TITLES[0], "ink", { at: b2 });

    // Each DWELL the segment glides to the next row on the responsive spring; the row it
    // leaves gets its "pass" (instant) and the tally steps with it; the row it reaches
    // steps up to fg as the segment arrives (~0.1s into the glide).
    for (let i = 0; i < LAST; i++) {
      const leave = round(b2 + (i + 1) * DWELL);
      m.tween("scan", { y: [i * ROW_H, (i + 1) * ROW_H] }, { at: leave });
      m.enter(TAGS[i], "fade", { at: leave, duration: "instant", ease: "out" });
      m.counter("passed", { from: i, to: i + 1, at: leave, duration: "instant", ease: "out" });
      m.emphasize(TITLES[i + 1], "ink", { at: round(leave + 0.1) });
    }

    // b3 · the segment fades off the last row, its "pass" lands, the tally reaches 6,
    // and the verdict steps up from the grey to fg.
    m.exit("scan", "fadeOut", { at: "b3" });
    m.enter(TAGS[LAST], "fade", { at: "b3", duration: "instant", ease: "out" });
    m.counter("passed", { from: LAST, to: LAST + 1, at: "b3", duration: "instant", ease: "out" });
    m.emphasize("verdict", "ink", { at: "b3+0.1" });

    // 1.016 is the most the 1024 product allows before its right edge leaves action-safe
    // (96 + 1728 × s ≤ 1853); every split chapter pushes the same.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
