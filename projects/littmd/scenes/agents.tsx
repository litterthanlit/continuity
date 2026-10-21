import { scene, El, Window, Tag } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 05 · Agent test — Claude builds a settings dialog in a fresh Vite app, and litt's
// own checks grade it (evals/agents/README.md). The run is the product: six checks in
// the order the harness runs them, each finishing on a success Tag in reading order,
// a tally in the footer that counts with them, and the verdict stepping up to fg.
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

const TAGS = CHECKS.map((_, i) => `tag${i}`);
const round = (t: number) => Math.round(t * 100) / 100;
const EACH = 0.28; // one check finishing after the other

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={WIN_H}>
      <Window ct="run" title="test:agents · settings-dialog" width={WIN_W} height={WIN_H}>
        <div class="relative h-full">
          {/* The checks: the List look (title, hairline), with the status slot on the right. */}
          <El ct="checks" data-ct-ui class="flex flex-col">
            {CHECKS.map((title, i) => (
              <El
                ct={`checks-r${i}`}
                class="flex items-center gap-[24px] border-b-2 border-line pl-[32px] pr-[16px]"
                style={{ height: `${ROW_H}px` }}
              >
                <span class="font-sans text-[28px] text-fg">{title}</span>
                <Tag ct={`tag${i}`} tone="success" class="ml-auto">
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
    // The push brings the run in with its rows (present from t=0, the status slots
    // still empty and the tally at 0), so it never lands on an empty frame. The
    // statement lands on the expressive spring: the scene's one moment. The summary follows.
    m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // b2 · the checks finish in reading order, one every 0.28s: each row's "pass" Tag
    // lands at the instant tier and the tally in the footer steps with it.
    CHECKS.forEach((_, i) => {
      const at = round(m.time("b2") + i * EACH);
      m.enter(TAGS[i], "fade", { at, duration: "instant", ease: "out" });
      m.counter("passed", { from: i, to: i + 1, at, duration: "instant", ease: "out" });
    });

    // b3 · the verdict steps up from the grey to fg.
    m.emphasize("verdict", "ink", { at: "b3" });

    // 1.016 is the most the 1024 product allows before its right edge leaves action-safe
    // (96 + 1728 × s ≤ 1853); every split chapter pushes the same.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
