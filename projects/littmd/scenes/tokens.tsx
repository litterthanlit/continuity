import { scene, El, Window, CodeBlock, Path, Tag } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 02 · Tokens — every value lives in one file. The window is litt's own tokens.css:
// weights by role, the two radii and the expressive spring, as written in the file
// (web values; no hex: those live only in tokens.css). At b3 the spring line takes
// the raised segment (P12) and the rest of the file steps back to the grey — it is
// the line the motion scene comes back to. At b4 the footer shows where the file goes:
// a rail draws along it and the three places that read tokens.css rise onto it.

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
const FOOT_H = 96; // the footer strip: a 56px Tag with 20px either side (hairline included)
const WIN_H = 64 + PAD + LINES.length * LINE_H + PAD + FOOT_H; // title bar + code + footer = 704

// The footer: where the file goes. Real: gallery/scripts/sync-tokens.mjs copies
// tokens.css into the gallery and gen-registry.mjs renames it --litt-* for the
// registry; tailwind.css is the layer built on it. UI data, imagery not copy.
const FLOWS = ["gallery", "registry · --litt-*", "tailwind.css"];
const FLOW_IDS = FLOWS.map((_, i) => `flow${i}`);
const FOOT_PAD = 32; // the footer's inset, as the reveal's footer
const LEAD_W = 128; // "flows to", mono 26 (8 × 15.6)
const RAIL_X = FOOT_PAD + LEAD_W + 24; // the rail starts 24 after the lead word
const RAIL_W = WIN_W - RAIL_X - FOOT_PAD; // 808, to the footer's right inset
// When the rail's tip reaches each Tag's left edge. The Tags sit at 5%, 31% and 71% of
// the rail (measured on the settled still); the draw runs 0.6s on inOut, which passes
// those points at 0.13s, 0.26s and 0.35s into the stroke.
const RAIL_AFTER = 0.1; // the rail follows the lead word into the strip
const FLOW_AT = [0.13, 0.26, 0.35];

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
          {/* Footer strip under a hairline: "flows to" in the grey, then the rail the file
              travels along, with its three destinations sitting on it. */}
          <El
            ct="flow"
            data-ct-ui
            class="absolute inset-x-0 bottom-0 flex items-center border-t-2 border-line"
            style={{ height: `${FOOT_H}px`, paddingLeft: `${FOOT_PAD}px` }}
          >
            <El as="span" ct="flow-lead" class="shrink-0 font-mono text-[26px] text-fg-subtle" style={{ width: `${LEAD_W}px` }}>
              flows to
            </El>
            <div class="relative ml-[24px] flex h-full items-center" style={{ width: `${RAIL_W}px` }}>
              <Path
                ct="flow-rail"
                d={`M1 1H${RAIL_W - 1}`}
                viewBox={`0 0 ${RAIL_W} 2`}
                width={RAIL_W}
                height={2}
                stroke="var(--color-line-strong)"
                strokeWidth={2}
                class="absolute left-0 top-1/2 -mt-[1px]"
              />
              <div class="relative flex w-full items-center justify-between px-[40px]">
                {/* Each Tag sits in a static slot of the window's own surface, so the
                    rail breaks where a destination lands and never shows through a Tag
                    while it fades up. */}
                {FLOWS.map((f, i) => (
                  <div class="rounded-control bg-surface-1">
                    <Tag ct={FLOW_IDS[i]}>{f}</Tag>
                  </div>
                ))}
              </div>
            </div>
          </El>
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
    m.enter(FILLED, "rise", { at: "b2", stagger: "list" }); // b2 waits for the headline to land

    // b3 · the spring line leads: the raised segment comes up behind it and the rest of
    // the file steps back to the grey, at the instant tier.
    m.enter("current", "fade", { at: "b3" });
    m.emphasize(BACK, "dim", { at: "b3", stagger: 0 });

    // b4 · where the file goes: the lead word fades, the rail draws to the right (slow,
    // inOut: the eye's tier for a stroke) and each destination rises as the rail's tip
    // reaches its left edge, in reading order (responsive).
    m.enter("flow-lead", "fade", { at: "b4" });
    const rail = m.time("b4") + RAIL_AFTER;
    m.enter("flow-rail", "draw", { at: rail });
    FLOW_IDS.forEach((id, i) => m.enter(id, "rise", { at: rail + FLOW_AT[i] }));

    // 1.016 is the most the 1024 product allows before its right edge leaves action-safe
    // (96 + 1728 × s ≤ 1853); every split chapter pushes the same.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
