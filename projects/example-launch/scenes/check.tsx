import type { ComponentChildren } from "preact";
import { scene, El, Card, Window, List, Terminal } from "continuity";
import { Chapter, SURFACE } from "../lib/chapter.js";

// 02 · Check — the film's punch. A contact sheet of the film (left) and the gate
// in a terminal (right). A collision on frame f5 is caught (red ring + two red
// findings), then fixed: the headline bar lifts off the CTA, the ring clears, the
// dots go green and the gate prints ✔.

// The shared chapter surface (1728 × 600) split into the sheet and the terminal, one gap.
const GAP = 40;
const H = SURFACE.height;

// Thumbnails: 16:9 tiles. Their shapes are drawn on a 284×160 design canvas and
// scaled to fit the tile, so the sheet fits the 600px surface.
const TH_W = 267;
const TH_H = 150;
const TH_GAP = 14;
const DESIGN_W = 284;
const DESIGN_H = 160;
const K = TH_H / DESIGN_H;

// Sheet card: hairline border + 32px padding around a 3×3 grid; the terminal takes the rest.
const SHEET_PAD = 32;
const SHEET_W = 2 + 2 * SHEET_PAD + 3 * TH_W + 2 * TH_GAP; // 895
const TERM_W = SURFACE.width - SHEET_W - GAP; // 793

// The fix: f5's headline bar is laid out where it collides with the CTA and
// lifts by FIX px to its right place.
const FIX = 22;

// Tiny backgrounds echoing the film's own (solid, aurora, grid).
const GRID_BG =
  "linear-gradient(color-mix(in oklab, var(--color-fg) 6%, transparent) 1px, transparent 1px) 0 0 / 16px 16px," +
  "linear-gradient(90deg, color-mix(in oklab, var(--color-fg) 6%, transparent) 1px, transparent 1px) 0 0 / 16px 16px," +
  "var(--color-bg)";
const AURORA_BG =
  "radial-gradient(70% 80% at 12% 0%, color-mix(in oklab, var(--color-accent) 32%, transparent) 0%, transparent 70%)," +
  "radial-gradient(60% 70% at 92% 10%, color-mix(in oklab, var(--color-accent-2) 16%, transparent) 0%, transparent 70%)," +
  "var(--color-bg)";
const GLOW_BG =
  "radial-gradient(55% 65% at 50% 55%, color-mix(in oklab, var(--color-accent) 22%, transparent) 0%, transparent 75%)," +
  "var(--color-bg)";

/** A shape inside a thumbnail, in px of the 284×160 design canvas. */
function B({ x, y, w, h, c, r = 3, ct, style }: { x: number; y: number; w: number; h: number; c: string; r?: number; ct?: string; style?: Record<string, string> }) {
  return (
    <El
      ct={ct}
      class={`absolute ${c}`}
      style={{ left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, borderRadius: `${r}px`, ...style }}
    />
  );
}

/** Small UI box inside a thumbnail. */
const Box = ({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children?: ComponentChildren }) => (
  <div
    class="absolute rounded-[5px] border border-fg/15 bg-surface"
    style={{ left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` }}
  >
    {children}
  </div>
);

/** Chapter header (accent dot · eyebrow · headline) shared by the chapter thumbnails. */
const ChapterHead = ({ w = 120 }: { w?: number }) => (
  <>
    <B x={22} y={20} w={6} h={6} r={3} c="bg-accent" />
    <B x={33} y={20} w={40} h={6} c="bg-fg/35" />
    <B x={22} y={33} w={w} h={13} c="bg-fg/90" />
  </>
);

const THUMBS: Array<{ bg: string; body: ComponentChildren }> = [
  // f0 · hook: two lines on black, accent caret
  {
    bg: "var(--color-bg)",
    body: (
      <>
        <B x={26} y={54} w={152} h={17} c="bg-fg/90" />
        <B x={184} y={50} w={3} h={25} r={1} c="bg-accent" />
        <B x={26} y={80} w={92} h={17} c="bg-fg/90" />
        <B x={124} y={80} w={34} h={17} c="bg-fg/50" style={{ filter: "blur(2.5px)" }} />
      </>
    ),
  },
  // f1 · studio: aurora, headline, the pipeline rail
  {
    bg: AURORA_BG,
    body: (
      <>
        <B x={22} y={24} w={44} h={6} c="bg-fg/40" />
        <B x={22} y={38} w={150} h={15} c="bg-fg/90" />
        <B x={22} y={60} w={74} h={15} c="bg-fg/90" />
        <B x={22} y={119} w={240} h={2} r={1} c="bg-fg/20" />
        {[0, 1, 2, 3, 4].map((k) => (
          <B
            x={22 + k * 52}
            y={113}
            w={32}
            h={14}
            r={7}
            c={k === 0 ? "bg-accent" : "border border-fg/25 bg-surface-2"}
          />
        ))}
      </>
    ),
  },
  // f2 · plan: storyboard window, current row highlighted
  {
    bg: GRID_BG,
    body: (
      <>
        <ChapterHead w={124} />
        <Box x={22} y={60} w={240} h={84}>
          <B x={0} y={39} w={238} h={14} r={0} c="bg-accent/20" />
          {[0, 1, 2, 3, 4].map((k) => (
            <>
              <B x={10} y={8 + k * 14} w={[64, 56, 70, 60, 66][k]} h={5} c={k === 2 ? "bg-fg/80" : "bg-fg/35"} />
              <B x={110} y={9 + k * 14} w={[70, 80, 86, 118, 90][k]} h={3} r={2} c="bg-fg/20" />
            </>
          ))}
        </Box>
      </>
    ),
  },
  // f3 · check: sheet + terminal, side by side
  {
    bg: GRID_BG,
    body: (
      <>
        <ChapterHead w={112} />
        <Box x={22} y={60} w={134} h={84}>
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => <B x={9 + c * 40} y={10 + r * 23} w={35} h={19} r={2} c="bg-fg/[0.13]" />),
          )}
        </Box>
        <Box x={162} y={60} w={100} h={84}>
          <B x={9} y={11} w={62} h={5} c="bg-fg/60" />
          <B x={9} y={27} w={6} h={6} r={3} c="bg-positive" />
          <B x={20} y={28} w={56} h={4} c="bg-fg/30" />
          <B x={9} y={41} w={6} h={6} r={3} c="bg-positive" />
          <B x={20} y={42} w={46} h={4} c="bg-fg/30" />
          <B x={9} y={62} w={70} h={5} c="bg-positive/70" />
        </Box>
      </>
    ),
  },
  // f4 · measure: the energy curve
  {
    bg: GRID_BG,
    body: (
      <>
        <ChapterHead w={104} />
        <Box x={22} y={60} w={240} h={84}>
          <svg class="absolute left-[12px] top-[10px]" width="214" height="44" viewBox="0 0 214 44" fill="none">
            <path
              d="M0 38 L19 10 L39 27 L58 6 L78 30 L97 15 L117 2 L136 26 L156 8 L175 31 L195 12 L214 4"
              stroke="var(--color-accent)"
              stroke-width="2.5"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
          {[0, 1, 2].map((k) => (
            <>
              <B x={12 + k * 62} y={64} w={54} h={11} r={6} c="border border-fg/20 bg-surface-2" />
              <B x={17 + k * 62} y={67} w={5} h={5} r={3} c="bg-positive" />
            </>
          ))}
        </Box>
      </>
    ),
  },
  // f5 · THE DEFECT: headline bar (f5b) collides with the CTA pill (f5a); faint caption (f5c)
  {
    bg: GLOW_BG,
    body: (
      <>
        <B ct="f5a" x={110} y={80} w={64} h={18} r={9} c="bg-accent" />
        <B ct="f5b" x={60} y={44 + FIX} w={164} h={22} c="bg-fg/90" />
        <B ct="f5c" x={92} y={112} w={100} h={6} c="bg-fg/50" style={{ opacity: "0.3" }} />
      </>
    ),
  },
  // f6 · critique: five axis bars + score
  {
    bg: GRID_BG,
    body: (
      <>
        <ChapterHead w={116} />
        <Box x={22} y={60} w={240} h={84}>
          {[0.82, 0.76, 0.9, 0.8, 0.86].map((v, k) => (
            <>
              <B x={10} y={9 + k * 14} w={128} h={5} c="bg-fg/[0.12]" />
              <B x={10} y={9 + k * 14} w={Math.round(128 * v)} h={5} c="bg-accent" />
            </>
          ))}
          <B x={158} y={14} w={56} h={22} c="bg-fg/90" />
          <B x={158} y={50} w={66} h={14} r={7} c="border border-fg/20 bg-surface-2" />
          <B x={163} y={54} w={6} h={6} r={3} c="bg-positive" />
        </Box>
      </>
    ),
  },
  // f7 · terminal close-up
  {
    bg: "var(--color-bg)",
    body: (
      <Box x={22} y={18} w={240} h={124}>
        <div class="absolute inset-x-0 top-0 h-[18px] border-b border-fg/10 bg-surface-2" />
        {["#ff5f57", "#febc2e", "#28c840"].map((col, k) => (
          <B x={8 + k * 10} y={6} w={6} h={6} r={3} c="" style={{ background: col }} />
        ))}
        <B x={12} y={32} w={6} h={6} r={1} c="bg-accent" />
        <B x={24} y={33} w={112} h={5} c="bg-fg/75" />
        <B x={12} y={52} w={150} h={4} c="bg-fg/30" />
        <B x={12} y={66} w={128} h={4} c="bg-fg/30" />
        <B x={12} y={80} w={140} h={4} c="bg-fg/30" />
        <B x={12} y={100} w={96} h={5} c="bg-positive/80" />
      </Box>
    ),
  },
  // f8 · end card: wordmark, tagline, CTA
  {
    bg: AURORA_BG,
    body: (
      <>
        <B x={62} y={50} w={160} h={26} c="bg-fg/95" />
        <B x={88} y={86} w={108} h={8} c="bg-fg/40" />
        <B x={112} y={106} w={60} h={16} r={8} c="border border-fg/25 bg-surface-2" />
        <B x={118} y={111} w={6} h={6} r={3} c="bg-accent" />
      </>
    ),
  },
];

// Radial bloom order for the 3×3 grid: centre, then the edge-adjacent frames,
// then the corners (reading order within each ring).
const BLOOM = [4, 1, 3, 5, 7, 0, 2, 6, 8].map((i) => `f${i}`);

const FINDINGS = [
  { title: "overlap · headline × cta", meta: "f5", status: "danger" as const },
  { title: "contrast 3.1:1 · caption", meta: "f5", status: "danger" as const },
];

export default scene({
  view: ({ text }) => (
    <Chapter eyebrow={text.eyebrow} headline={text.headline}>
      <div class="flex items-start" style={{ gap: `${GAP}px` }}>
        {/* Contact sheet */}
        <Card
          ct="sheet"
          class="flex flex-col gap-[22px]"
          style={{ width: `${SHEET_W}px`, height: `${H}px`, padding: `${SHEET_PAD}px` }}
        >
          <div class="flex h-[34px] items-center justify-between font-mono text-[26px]">
            <span class="text-muted">sheet.png</span>
            <span class="text-subtle">launch · 31s</span>
          </div>
          <El
            ct="frames"
            class="grid"
            style={{ gridTemplateColumns: `repeat(3, ${TH_W}px)`, gridAutoRows: `${TH_H}px`, gap: `${TH_GAP}px` }}
          >
            {THUMBS.map((t, i) => (
              <El ct={`f${i}`} class="relative" data-layout-ignore>
                <div class="absolute inset-0 overflow-hidden rounded-[10px] border border-border" style={{ background: t.bg }}>
                  <div
                    class="absolute left-0 top-0"
                    style={{ width: `${DESIGN_W}px`, height: `${DESIGN_H}px`, transform: `scale(${K})`, transformOrigin: "0 0" }}
                  >
                    {t.body}
                  </div>
                </div>
                {i === 5 && (
                  <El ct="ring" class="absolute -inset-[8px] rounded-[16px] border-[3px] border-danger" />
                )}
              </El>
            ))}
          </El>
        </Card>

        {/* The gate */}
        <Window ct="term" title="zsh" width={TERM_W} height={H}>
          <div class="flex flex-col px-[40px] py-[38px]">
            {/* Same styling as the kit Terminal, but the prompt is outside the typed span
                so it is already waiting when the command types on. */}
            <El ct="cmd" data-ct-ui class="whitespace-pre font-mono text-[28px] leading-[1.6] text-fg">
              <span class="text-accent">❯</span> <El as="span" ct="cmd-l0">pnpm ct check launch</El>
            </El>
            {/* The gate at work: every frame of the 31s film (31 × 30fps). */}
            <Terminal ct="scan" lines={["◆ 930 frames · 7 scenes"]} />
            {/* The report box arrives with the findings (b3); -mb-px tucks the last row's
                hairline under the box border. Its left edge is the verdict: red → green. */}
            <El ct="report" class="relative mt-[30px] overflow-hidden rounded-md border border-border bg-surface-2/50">
              <div class="absolute inset-y-0 left-0 w-[4px] bg-danger" />
              <El ct="goodbar" class="absolute inset-y-0 left-0 w-[4px] bg-positive" />
              <List ct="findings" rows={FINDINGS} class="-mb-px" />
              {FINDINGS.map((_, i) => (
                <El
                  ct={`good${i}`}
                  class="absolute left-[28px] h-[18px] w-[18px] rounded-full bg-positive"
                  style={{ top: `${i * 78 + 30}px` }}
                />
              ))}
            </El>
            <Terminal ct="done" class="mt-[30px]" lines={["✔ 0 errors · 0 warnings"]} />
          </div>
        </Window>
      </div>
    </Chapter>
  ),
  motion: (m) => {
    // b1 · copy, then the contact sheet; its frames bloom from the centre of the grid.
    m.enter("eyebrow", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.1", split: "lines" });
    m.enter("sheet", "rise", { at: "b1+0.2", distance: 80, duration: "hero" });
    m.tween("sheet", { rotateX: [10, 0] }, { at: "b1+0.2", duration: "hero", ease: "enter", kind: "enter" });
    m.enter(BLOOM, "scalePop", { at: "after:sheet-0.4", stagger: "grid" });

    // b2 · the gate: terminal rises, the prompt is waiting, the command types on.
    m.enter("term", "rise", { at: "b2", distance: 80, duration: "hero" });
    m.tween("term", { rotateX: [10, 0] }, { at: "b2", duration: "hero", ease: "enter", kind: "enter" });
    m.type("cmd-l0", { at: "b2+0.6", cps: 24 });
    m.enter("scan-l0", "fade", { at: "b3-0.3", duration: "fast" }); // typing ends ≈2.57s

    // b3 · RED: the report lands with two findings; the ring locks onto f5, which flinches.
    m.enter("report", "fade", { at: "b3", duration: "fast" });
    m.enter(["findings-r0", "findings-r1"], "rise", { at: "b3", distance: 18, stagger: "list" });
    m.tween("ring", { scale: [1.12, 1], opacity: [0, 1] }, { at: "b3+0.1", ease: "snappy", kind: "enter" });
    m.emphasize("f5", "nudge", { at: "b3+0.1" });

    // b4 · GREEN: the fix. Only f5, the dots and the ✔ line move — everything else holds.
    m.tween("f5b", { y: [0, -FIX] }, { at: "b4", duration: "base", ease: "standard" });
    m.tween("f5c", { opacity: [0.3, 1] }, { at: "b4", duration: "base", ease: "standard" }); // caption contrast fixed
    m.exit("ring", "fadeOut", { at: "b4" });
    m.enter(["good0", "good1"], "fade", { at: "b4+0.1", duration: "fast", stagger: 0.15 });
    m.emphasize("f5", "glow", { at: "b4+0.3" });
    // The verdict: the report edge turns green as ✔ prints. base (not slow) so the
    // ✔ line is landed ≥ 0.8s before the push.
    m.enter("goodbar", "fade", { at: "b4+0.35", duration: "fast" });
    m.enter("done-l0", "rise", { at: "b4+0.35", distance: 12, duration: "base" });

    m.camera({ scale: [1, 1.025] });
  },
});
