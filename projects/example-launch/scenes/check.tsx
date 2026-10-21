import type { ComponentChildren } from "preact";
import { scene, El, Card, Window, Terminal, Tag } from "continuity";
import { Chapter, STACKED } from "../lib/chapter.js";
import { FILM_FRAMES, FILM_S, SCENES, fmtS } from "../lib/film.js";

// 02 · Check — the film's punch. A contact sheet of this film (left) and the gate
// in a terminal (right). A collision on frame f5 is caught (a danger ring, two
// findings tagged "error"), then fixed: the wordmark lifts off the button, the
// ring clears, "error" becomes "fixed" and the gate prints ✔. Colour here is
// status only: danger and success, as words and the one mark on the sheet.

// The one stacked chapter: the full title-safe width (1728 × 600) holds the sheet and
// the terminal side by side, one block gap.
const GAP = 32;
const H = STACKED.height;

// Thumbnails: 16:9 tiles. Their shapes are drawn on a 284×160 design canvas
// (a 1920×1080 frame at 0.148) and scaled to the tile.
const TH_W = 267;
const TH_H = 150;
const TH_GAP = 14;
const DESIGN_W = 284;
const DESIGN_H = 160;
const K = TH_H / DESIGN_H;

// Sheet card: 32px padding around a header and the 3×3 grid; the terminal takes the rest.
const SHEET_PAD = 32;
const SHEET_W = 2 * SHEET_PAD + 3 * TH_W + 2 * TH_GAP; // 893
const TERM_W = STACKED.width - SHEET_W - GAP; // 803

// The fix: f5's wordmark bar is laid out where it collides with the button and
// lifts by FIX px to its right place.
const FIX = 22;

/** A shape inside a thumbnail, in px of the 284×160 design canvas (radii are litt's, scaled). */
function B({ x, y, w, h, c, r = 1, ct, style }: { x: number; y: number; w: number; h: number; c: string; r?: number; ct?: string; style?: Record<string, string> }) {
  return (
    <El
      ct={ct}
      class={`absolute ${c}`}
      style={{ left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, borderRadius: `${r}px`, ...style }}
    />
  );
}

/** A raised UI surface inside a thumbnail (a window, a card). */
const Box = ({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children?: ComponentChildren }) => (
  <div
    class="absolute bg-surface-1"
    style={{ left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, borderRadius: "3px", boxShadow: "inset 0 0 0 1px var(--color-line-strong)" }}
  >
    {children}
  </div>
);

/** A chapter's lockup (label · display line · sub), as in every chapter thumbnail. */
const ChapterHead = ({ w = 120 }: { w?: number }) => (
  <>
    <B x={22} y={16} w={34} h={5} c="bg-fg/40" />
    <B x={22} y={25} w={w} h={14} c="bg-fg/90" />
    <B x={22} y={44} w={Math.round(w * 0.8)} h={6} c="bg-fg/40" />
  </>
);

// f4's mini energy curve: the film's main peaks and holds [s, 0..1], thinned for thumbnail scale.
const MINI_ENERGY: [number, number][] = [
  [0, 0.12], [3, 0.62], [6, 0.2], [9.5, 0.82], [12.5, 0.3], [16.2, 0.92], [19.5, 0.25], [23, 0.78], [27, 0.2], [31, 0.12],
];
const MINI_CURVE = (() => {
  const pts = MINI_ENERGY.map(([t, v]) => [(t / 31) * 214, 40 - 3 - v * 34]);
  const f = (n: number) => n.toFixed(1);
  return pts
    .map(([x, y], i) => {
      if (i === 0) return `M${f(x)} ${f(y)}`;
      const [x0, y0] = pts[i - 1];
      const h = (x - x0) / 2.4;
      return `C${f(x0 + h)} ${f(y0)} ${f(x - h)} ${f(y)} ${f(x)} ${f(y)}`;
    })
    .join(" ");
})();

const THUMBS: Array<{ lit?: boolean; body: ComponentChildren }> = [
  // f0 · hook: the couplet on the canvas, "see" in fg, the focus caret
  {
    body: (
      <>
        <B x={26} y={56} w={150} h={16} c="bg-fg/45" />
        <B x={182} y={53} w={2} h={21} r={0} c="bg-focus" />
        <B x={26} y={80} w={86} h={16} c="bg-fg/45" />
        <B x={118} y={80} w={34} h={16} c="bg-fg/95" />
        <B x={158} y={80} w={20} h={16} c="bg-fg/45" />
      </>
    ),
  },
  // f1 · studio: the light, the statement in the grey with one word in fg, the rail
  {
    lit: true,
    body: (
      <>
        <B x={22} y={28} w={36} h={5} c="bg-fg/40" />
        <B x={22} y={38} w={150} h={15} c="bg-fg/45" />
        <B x={22} y={58} w={34} h={15} c="bg-fg/45" />
        <B x={60} y={58} w={40} h={15} c="bg-fg/95" />
        <B x={22} y={115} w={240} h={1} r={0} c="bg-fg/25" />
        {[0, 1, 2, 3, 4].map((k) => (
          <B x={22 + k * 52} y={109} w={32} h={12} r={1} c={k === 0 ? "bg-surface-2 ring-1 ring-focus" : "bg-surface-2"} />
        ))}
      </>
    ),
  },
  // f2 · plan: storyboard window, the current row raised
  {
    body: (
      <>
        <ChapterHead w={124} />
        <Box x={22} y={62} w={240} h={84}>
          <B x={4} y={38} w={232} h={13} c="bg-surface-3" />
          {[0, 1, 2, 3, 4].map((k) => (
            <>
              <B x={10} y={10 + k * 14} w={[64, 56, 70, 60, 66][k]} h={4} c={k === 2 ? "bg-fg/90" : "bg-fg/35"} />
              <B x={110} y={11 + k * 14} w={[60, 70, 76, 112, 80][k]} h={2} c="bg-fg/20" />
            </>
          ))}
        </Box>
      </>
    ),
  },
  // f3 · check: sheet + terminal, side by side
  {
    body: (
      <>
        <ChapterHead w={132} />
        <Box x={22} y={62} w={134} h={84}>
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => <B x={9 + c * 40} y={10 + r * 23} w={35} h={19} c="bg-fg/[0.10]" />),
          )}
        </Box>
        <Box x={162} y={62} w={100} h={84}>
          <B x={9} y={11} w={62} h={4} c="bg-fg/70" />
          <B x={9} y={26} w={50} h={3} c="bg-fg/30" />
          <B x={9} y={38} w={44} h={3} c="bg-fg/30" />
          <B x={9} y={64} w={70} h={4} c="bg-success" />
        </Box>
      </>
    ),
  },
  // f4 · measure: the energy curve in fg, the verdict words in success
  {
    body: (
      <>
        <ChapterHead w={110} />
        <Box x={22} y={62} w={240} h={84}>
          <svg class="absolute left-[12px] top-[8px]" width="214" height="40" viewBox="0 0 214 40" fill="none">
            <path d={MINI_CURVE} stroke="var(--color-fg)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          </svg>
          {[0, 1, 2].map((k) => (
            <B x={12 + k * 50} y={62} w={40} h={10} c="bg-surface-2" style={{ boxShadow: "inset 0 0 0 1px var(--color-line-strong)" }} />
          ))}
          {[0, 1, 2].map((k) => (
            <B x={17 + k * 50} y={66} w={28} h={2} c="bg-success" />
          ))}
        </Box>
      </>
    ),
  },
  // f5 · THE DEFECT: an end-card draft whose wordmark (f5b) collides with the button (f5a); the caption (f5c) is too faint
  {
    lit: true,
    body: (
      <>
        <B ct="f5a" x={114} y={84} w={56} h={16} r={1} c="bg-accent" />
        <B ct="f5b" x={66} y={44 + FIX} w={152} h={22} c="bg-fg/90" />
        <B ct="f5c" x={96} y={112} w={92} h={6} c="bg-fg/45" style={{ opacity: "0.3" }} />
      </>
    ),
  },
  // f6 · critique: five meters + the score
  {
    body: (
      <>
        <ChapterHead w={118} />
        <Box x={22} y={62} w={240} h={84}>
          {[0.82, 0.76, 0.9, 0.8, 0.86].map((v, k) => (
            <>
              <B x={10} y={11 + k * 14} w={128} h={3} c="bg-fg/[0.12]" />
              <B x={10} y={11 + k * 14} w={Math.round(128 * v)} h={3} c="bg-fg/90" />
            </>
          ))}
          <B x={162} y={14} w={44} h={5} c="bg-fg/40" />
          <B x={162} y={24} w={52} h={18} c="bg-fg/90" />
          <B x={162} y={52} w={34} h={10} c="bg-surface-2" style={{ boxShadow: "inset 0 0 0 1px var(--color-line-strong)" }} />
          <B x={167} y={56} w={24} h={2} c="bg-success" />
        </Box>
      </>
    ),
  },
  // f7 · terminal close-up: neutral window dots, grey output, the ✔ line
  {
    body: (
      <Box x={22} y={18} w={240} h={124}>
        <div class="absolute inset-x-0 top-[18px] h-px bg-line-strong" />
        {[0, 1, 2].map((k) => (
          <B x={8 + k * 10} y={6} w={6} h={6} r={3} c="bg-fg/15" />
        ))}
        <B x={12} y={32} w={6} h={4} c="bg-fg/40" />
        <B x={24} y={32} w={112} h={4} c="bg-fg/85" />
        <B x={12} y={52} w={150} h={3} c="bg-fg/30" />
        <B x={12} y={66} w={128} h={3} c="bg-fg/30" />
        <B x={12} y={80} w={140} h={3} c="bg-fg/30" />
        <B x={12} y={100} w={96} h={4} c="bg-success" />
      </Box>
    ),
  },
  // f8 · end card: the light, wordmark, tagline, the button
  {
    lit: true,
    body: (
      <>
        <B x={74} y={48} w={136} h={22} c="bg-fg/95" />
        <B x={96} y={78} w={92} h={6} c="bg-fg/45" />
        <B x={114} y={98} w={56} h={16} r={1} c="bg-accent" />
      </>
    ),
  },
];

// Radial order for the 3×3 grid: centre, then the edge-adjacent frames, then the corners.
const BLOOM = [4, 1, 3, 5, 7, 0, 2, 6, 8].map((i) => `f${i}`);
// Everything but the defect frame: recedes while f5 is red, returns with the ✔.
const OTHERS = BLOOM.filter((id) => id !== "f5");

const FINDINGS = [
  { title: "overlap · headline × cta", meta: "f5" },
  { title: "contrast 3.1:1 · caption", meta: "f5" },
];
const ROW_H = 80;

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} layout="stacked" height={H}>
      <div class="flex items-start" style={{ gap: `${GAP}px` }}>
        {/* Contact sheet */}
        <Card
          ct="sheet"
          class="flex flex-col gap-[22px]"
          style={{ width: `${SHEET_W}px`, height: `${H}px`, padding: `${SHEET_PAD}px` }}
        >
          <div class="flex h-[36px] items-center justify-between font-mono text-[26px]">
            <span class="text-fg-muted">sheet.png</span>
            <span class="text-fg-subtle">launch · {fmtS(FILM_S)}</span>
          </div>
          <El
            ct="frames"
            class="grid"
            style={{ gridTemplateColumns: `repeat(3, ${TH_W}px)`, gridAutoRows: `${TH_H}px`, gap: `${TH_GAP}px` }}
          >
            {THUMBS.map((t, i) => (
              <El ct={`f${i}`} class="relative" data-layout-ignore>
                <div class="absolute inset-0 overflow-hidden rounded-control bg-canvas shadow-hairline">
                  {t.lit && <div class="ct-lit absolute inset-0" />}
                  <div
                    class="absolute left-0 top-0"
                    style={{ width: `${DESIGN_W}px`, height: `${DESIGN_H}px`, transform: `scale(${K})`, transformOrigin: "0 0" }}
                  >
                    {t.body}
                  </div>
                </div>
                {i === 5 && <El ct="ring" class="absolute -inset-[8px] rounded-surface border-[4px] border-danger" />}
              </El>
            ))}
          </El>
        </Card>

        {/* The gate */}
        <Window ct="term" title="zsh" width={TERM_W} height={H}>
          <div class="flex flex-col px-[40px] py-[36px]">
            {/* The kit Terminal's styling, with the prompt outside the typed span so it is
                already waiting when the command types on. */}
            <El ct="cmd" data-ct-ui class="whitespace-pre font-mono text-[28px] leading-[1.6] text-fg">
              <span class="text-fg-subtle">$</span> <El as="span" ct="cmd-l0">pnpm ct check launch</El>
            </El>
            {/* The gate at work: every frame of the film. */}
            <Terminal ct="scan" lines={[`◆ ${FILM_FRAMES} frames · ${SCENES.length} scenes`]} />
            {/* The report arrives with the findings (b3). Status is a word in a Tag. */}
            <El ct="report" class="relative mt-[32px] overflow-hidden rounded-control bg-surface-2 shadow-hairline">
              <El ct="findings" data-ct-ui class="-mb-[2px] flex flex-col">
                {FINDINGS.map((r, i) => (
                  <El
                    ct={`findings-r${i}`}
                    class="flex items-center gap-[24px] border-b-2 border-line pl-[32px] pr-[16px]"
                    style={{ height: `${ROW_H}px` }}
                  >
                    <El as="span" ct={`title${i}`} class="font-sans text-[28px] text-fg">
                      {r.title}
                    </El>
                    <span class="ml-auto font-mono text-[26px] text-fg-subtle">{r.meta}</span>
                    {/* "error" and "fixed" share a slot; the swap is a step at the instant tier. */}
                    <span class="relative inline-flex w-[112px] justify-end">
                      <Tag ct={`err${i}`} tone="danger">
                        <span data-layout-allow-overlap>error</span>
                      </Tag>
                      <span class="absolute inset-0 flex justify-end">
                        <Tag ct={`ok${i}`} tone="success">
                          <span data-layout-allow-overlap>fixed</span>
                        </Tag>
                      </span>
                    </span>
                  </El>
                ))}
              </El>
            </El>
            <Terminal ct="done" class="mt-[32px]" lines={["✔ 0 errors · 0 warnings"]} />
          </div>
        </Window>
      </div>
    </Chapter>
  ),
  motion: (m) => {
    // The push brings the surfaces in (present at t=0); copy, then the frames come up.
    m.enter("headline", "maskUp", { at: "b1", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });
    m.enter(BLOOM, "fade", { at: "b1+0.3", stagger: "grid" });

    // b2 · the prompt is waiting; the command types on, the gate scans every frame.
    m.type("cmd-l0", { at: "b2", cps: 24 });
    m.enter("scan-l0", "fade", { at: "b3-0.3" }); // typing ends ≈ 2.0s

    // b3 · RED. The report lands with two findings; the ring locks onto f5 at the
    // instant tier; the rest of the sheet recedes; the camera focuses. Then: hold.
    m.enter("report", "fade", { at: "b3" });
    m.enter(["findings-r0", "findings-r1"], "rise", { at: "b3", stagger: "list" });
    m.enter("ring", "fade", { at: "b3+0.1", duration: "instant", ease: "out" });
    m.tween(OTHERS, { opacity: [1, 0.4] }, { at: "b3+0.1", duration: "slow", ease: "inOut", stagger: 0 });

    // b4 · GREEN. f5 is fixed, the ring clears, each finding flips to "fixed" and its
    // title steps back to the grey; the verdict is placed (the scene's one moment).
    m.tween("f5b", { y: [0, -FIX] }, { at: "b4" });
    m.tween("f5c", { opacity: [0.3, 1] }, { at: "b4", duration: "instant", ease: "out" }); // caption contrast fixed
    m.exit("ring", "fadeOut", { at: "b4" });
    m.exit(["err0", "err1"], "fadeOut", { at: "b4+0.15", duration: "instant", stagger: "list" });
    m.enter(["ok0", "ok1"], "fade", { at: "b4+0.15", duration: "instant", ease: "out", stagger: "list" });
    m.emphasize(["title0", "title1"], "dim", { at: "b4+0.15", stagger: "list" });
    m.enter("done-l0", "settle", { at: "b4+0.35" });
    m.tween(OTHERS, { opacity: 1 }, { at: "b4+0.35", duration: "slow", ease: "inOut", stagger: 0 });

    // Camera: a quiet drift, then a short focus move on the red (b3) that holds
    // through the fix. 1.03 in all: the surfaces span the full safe width.
    m.camera({ scale: [1, 1.01] }, { at: 0, duration: m.time("b3") });
    m.camera({ scale: [1.01, 1.03] }, { at: "b3", duration: "slow", ease: "inOut" });
  },
});
