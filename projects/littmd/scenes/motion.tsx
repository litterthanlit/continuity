import { scene, El, Card } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 06 · Motion — litt's three tiers, shown rather than told. One flat card, three rows
// split by hairlines: the tier's name (28, 500, fg) and its spec in mono (26, the grey),
// over a track (fg 8%) whose fg fill runs from the left on that very tier. The fills all
// stop at one marked end point, short of the track's end, so they land on the same
// line and the expressive spring has room to pass it and come back (no clip edge).
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
const RUNOUT = 48; // track beyond the end mark: headroom for the overshoot
const FILL_W = INNER - RUNOUT; // 848, where every fill lands
const MARK_H = 24; // the end mark: 2px wide, 8px above and below the 8px track
const LINE_H = 36; // title / spec line
const GAP = 24; // spec line → track
const TRACK_H = 8;
const ROW_GAP = 48; // either side of a hairline
const CARD_H = 2 * PAD + 3 * (LINE_H + GAP + TRACK_H) + 2 * (2 * ROW_GAP + 2); // 528

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={CARD_H}>
      <Card ct="tiers" class="flex flex-col" style={{ width: `${SPLIT.width}px`, height: `${CARD_H}px`, padding: `${PAD}px` }}>
        {TIERS.map((tier, i) => (
          <El
            ct={`row${i}`}
            class={`flex flex-col ${i > 0 ? "border-t-2 border-line" : ""}`}
            style={{
              gap: `${GAP}px`,
              paddingTop: i > 0 ? `${ROW_GAP}px` : "0px",
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
    </Chapter>
  ),
  motion: (m) => {
    // The card, its rows and the empty tracks ride in with the push: the frame is never
    // empty. Only the statement and the fills move.
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // Each fill runs on the tier it names.
    // b2 · Instant: a 100ms ease-out tween. Under the 150ms spatial floor on purpose —
    // that speed IS the tier being shown.
    m.tween("fill0", { scaleX: [0, 1] }, { at: "b2", duration: "instant", ease: "out", kind: "enter", allow: ["duration-too-fast"] });
    // b3 · Responsive: the default spring (visual 0.2s, bounce 0).
    m.tween("fill1", { scaleX: [0, 1] }, { at: "b3", ease: "responsive", kind: "enter" });
    // b4 · Expressive: visual 0.35s, bounce 0.12 — the scene's one expressive moment.
    m.tween("fill2", { scaleX: [0, 1] }, { at: "b4", ease: "expressive", kind: "enter" });

    // The push holds the lockup's left edge still, so the dip doesn't snap it.
    // 1.016 is the most the 1024 product allows before its right edge leaves action-safe
    // (96 + 1728 × s ≤ 1853); every split chapter pushes the same.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
