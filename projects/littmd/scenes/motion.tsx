import { scene, El, Card, Button, Cursor } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 06 · Motion — litt's three tiers, shown rather than told, and run by hand. One flat
// card: a header (the file, 'tiers.tsx', in mono and the grey; a secondary sm Run button),
// then three rows split by hairlines: the tier's name (28, 500) and its spec in mono
// (26, the grey), over a track (fg 8%) whose fg fill runs from the left on that very tier.
// The fills all stop at one marked end point, short of the track's end, so they land on
// the same line and the expressive spring has room to pass it and come back (no clip edge).
// Honest physics: bounce 0.12 is damping ratio 0.88, a 0.3% overshoot (~2.5px here, at
// +0.44s). The tiers read by their timing (0.1s, ~0.35s, ~0.58s), not by a wobble.

// UI data: the tiers are imagery, the numbers are litt's fixed motion decisions.
const TIERS = [
  { title: "Instant", spec: "100ms · ease-out" },
  { title: "Responsive", spec: "spring 200ms · bounce 0" },
  { title: "Expressive", spec: "spring 350ms · bounce 0.12" },
];

const PAD = 64; // the Card's padding (inside, the rows on the 16 grid)
const INNER = SPLIT.width - 2 * PAD; // 896
const RUNOUT = 16; // track beyond the end mark: headroom for the overshoot
const FILL_W = INNER - RUNOUT; // 880, where every fill lands
const MARK_H = 24; // the end mark: 2px wide, 8px above and below the 8px track
const HEAD_H = 64; // the header row: a sm Button's height
const LINE_H = 36; // title / spec line
const GAP = 24; // spec line → track
const TRACK_H = 8;
const ROW_GAP = 48; // either side of a hairline
const CARD_H = 2 * PAD + HEAD_H + 3 * (LINE_H + GAP + TRACK_H) + 3 * (2 * ROW_GAP + 2); // 690

// The cursor rests with its tip on Run, just right of and below the label's centre
// (card px; the button is ~96 wide, flush right), so the pointer hides little of it.
const TIP = { x: PAD + INNER - 40, y: PAD + HEAD_H / 2 + 12 };
const ENTRY = { x: 256, y: 160 }; // its offset at the start: past the frame's right edge

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={CARD_H}>
      <Card ct="tiers" class="flex flex-col" style={{ width: `${SPLIT.width}px`, height: `${CARD_H}px`, padding: `${PAD}px` }}>
        <div class="flex items-center justify-between" style={{ height: `${HEAD_H}px`, marginBottom: `${ROW_GAP}px` }}>
          <El as="span" ct="file" class="font-mono text-[26px] leading-[36px] text-fg-subtle">
            tiers.tsx
          </El>
          <Button ct="run" size="sm">
            Run
          </Button>
        </div>
        {TIERS.map((tier, i) => (
          <El
            ct={`row${i}`}
            class="flex flex-col border-t-2 border-line"
            style={{
              gap: `${GAP}px`,
              paddingTop: `${ROW_GAP}px`,
              paddingBottom: i < TIERS.length - 1 ? `${ROW_GAP}px` : "0px",
            }}
          >
            <div class="flex items-baseline justify-between" style={{ height: `${LINE_H}px` }}>
              <El as="span" ct={`title${i}`} class="font-sans text-[28px] font-title leading-[36px] text-fg">
                {tier.title}
              </El>
              <El as="span" ct={`spec${i}`} class="font-mono text-[26px] leading-[36px] text-fg-subtle">
                {tier.spec}
              </El>
            </div>
            <div class="relative" style={{ height: `${TRACK_H}px` }}>
              <El ct={`track${i}`} class="absolute inset-0 rounded-full bg-fg/8" />
              {/* the end mark: where the fill lands (painted under the fill) */}
              <div
                class="absolute bg-fg-subtle"
                style={{ left: `${FILL_W - 1}px`, top: `${(TRACK_H - MARK_H) / 2}px`, width: "2px", height: `${MARK_H}px` }}
              />
              <El
                ct={`fill${i}`}
                class="absolute inset-y-0 left-0 rounded-full bg-fg"
                style={{ width: `${FILL_W}px`, transformOrigin: "left center" }}
              />
            </div>
          </El>
        ))}
      </Card>
      {/* At rest on Run: the tip (2px in from the pointer box's corner) at TIP. */}
      <div class="absolute" style={{ left: `${TIP.x - 2}px`, top: `${TIP.y - 2}px` }}>
        <Cursor ct="cursor" class="left-0 top-0" />
      </div>
    </Chapter>
  ),
  motion: (m) => {
    // The card, its header, rows and empty tracks ride in with the push: the frame is
    // never empty. The statement lands first, then the hand acts on the product.
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // b2 · The cursor comes in from the right edge: one eased leg (slow, inOut) to Run.
    // It leaves 0.1s ahead of b2 so it lands with a 200ms pause before the click at b3-0.1.
    m.tween("cursor", { x: [ENTRY.x, 0], y: [ENTRY.y, 0] }, { at: "b2-0.1", duration: "slow", ease: "inOut", kind: "move" });
    // The click ring is the focus colour; it is hidden until the click (its first tween
    // would otherwise hold its 0.8 start opacity from t=0).
    m.tween("cursor-ripple", { opacity: [0, 0] }, { at: 0, duration: "instant", ease: "out", kind: "emphasis" });
    m.click("cursor", { at: "b3-0.1" });
    m.emphasize("run", "press", { at: "b3-0.1" });

    // b3 · The race: the UI answers 100ms after the click. All three start together and
    // run on the tier they name, so the difference is the timing against one finish line
    // — instant snaps, responsive lands, expressive arrives last. One start on purpose: a
    // staggered start would hide the tiers' difference, so the three carry
    // unstaggered-group.
    // Instant: a 100ms ease-out tween. Under the 150ms spatial floor on purpose —
    // that speed IS the tier being shown.
    m.tween("fill0", { scaleX: [0, 1] }, { at: "b3", duration: "instant", ease: "out", kind: "enter", allow: ["duration-too-fast", "unstaggered-group"] });
    // Responsive: the default spring (visual 0.2s, bounce 0).
    m.tween("fill1", { scaleX: [0, 1] }, { at: "b3", ease: "responsive", kind: "enter", allow: ["unstaggered-group"] });
    // Expressive: visual 0.35s, bounce 0.12 — the scene's one expressive moment.
    m.tween("fill2", { scaleX: [0, 1] }, { at: "b3", ease: "expressive", kind: "enter", allow: ["unstaggered-group"] });

    // The hand has nothing left to do once the race is run: it goes.
    m.exit("cursor", "fadeOut", { at: "b3+0.9" });

    // The push holds the lockup's left edge still, so the dip doesn't snap it.
    // 1.016 is the most the 1024 product allows before its right edge leaves action-safe
    // (96 + 1728 × s ≤ 1853); every split chapter pushes the same.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
