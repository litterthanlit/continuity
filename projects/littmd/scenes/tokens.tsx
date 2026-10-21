import { scene, El, Window, CodeBlock } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 02 · Tokens — every value lives in one file. The window is litt's own tokens.css:
// weights by role, the two radii and the expressive spring, as written in the file
// (web values; no hex: those live only in tokens.css). At b3 the spring line takes
// the raised segment (P12) and the rest of the file steps back to the grey — it is
// the line the motion scene comes back to.

// UI data: real lines from tokens.css (imagery, not copy).
const LINES = [
  "--weight: 400;",
  "--weight-title: 500;",
  "--weight-label: 600;",
  "",
  "--radius-control: 4px;",
  "--radius-surface: 8px;",
  "",
  "--spring-expressive: 350ms 0.12;",
];
const CODE = LINES.join("\n");
const CURRENT = LINES.length - 1; // the spring line

const WIN_W = SPLIT.width;
const PAD = 48; // code inset, top and bottom
const LINE_H = 56; // rows on the 8 grid (28px mono, airy enough for the raised segment)
const WIN_H = 64 + PAD + LINES.length * LINE_H + PAD; // title bar + code = 608

const IDS = LINES.map((_, i) => `file-l${i}`);
const FILLED = IDS.filter((_, i) => LINES[i] !== ""); // blank lines have nothing to show
const BACK = FILLED.filter((id) => id !== IDS[CURRENT]);

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={WIN_H}>
      <Window ct="win" title="tokens.css" width={WIN_W} height={WIN_H}>
        <div class="relative h-full">
          {/* The raised segment (P12) behind the spring line, under the code. */}
          <El
            ct="current"
            class="absolute left-[16px] right-[16px] rounded-control bg-surface-2 shadow-raised"
            style={{ top: `${PAD + CURRENT * LINE_H}px`, height: `${LINE_H}px` }}
          />
          {/* The kit's CodeBlock, wrapped so a line's ink can step back: its fg tokens
              inherit the line's colour (fg by default, the grey when dimmed); the signs
              and the line numbers keep the grey. Rows set on the 56px rhythm. */}
          <CodeBlock
            ct="file"
            code={CODE}
            class="relative w-fit px-[16px] pt-[48px] text-fg [&>div]:leading-[56px] [&_.text-fg]:[color:inherit]"
          />
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // The window came with the push: it is on screen from t=0 (line numbers only), so
    // the push never lands on an empty frame. The statement is the scene's one moment.
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // b2 · the file fills in, line by line (responsive).
    m.enter(FILLED, "rise", { at: "b2", stagger: "list" });

    // b3 · the spring line leads: the raised segment comes up behind it and the rest of
    // the file steps back to the grey, at the instant tier.
    m.enter("current", "fade", { at: "b3" });
    m.emphasize(BACK, "dim", { at: "b3", stagger: 0 });

    // 1.016 is the most the 1024 product allows before its right edge leaves action-safe
    // (96 + 1728 × s ≤ 1853); every split chapter pushes the same.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
