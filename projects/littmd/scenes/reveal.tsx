import { scene, El, Window } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 01 · Reveal — the answer to the hook, in the light: litt.md names itself, and
// its taste is on screen as what it is, a file of rules. The profile window holds
// five real rules from taste/profile.md (title + mono P-id), on the List's 88px
// rhythm. Then the product acts: the raised segment (P12) walks the rules,
// P1 → P4 → P9, on the responsive spring. litt on its own surface: titles in the
// grey, so the rule under the segment steps up to fg by ink alone, and the one it
// left steps back; the footer strip swaps to that rule's Check line at each stop.

// UI data: real litt.md rules and their checks (taste/profile.md), imagery not copy.
const RULES = [
  { title: "Light, not paint", id: "P1" },
  { title: "Glass is earned", id: "P3" },
  { title: "Depth without drop shadows", id: "P4" },
  { title: "Weight by role", id: "P9" },
  { title: "Selected is a raised segment", id: "P12" },
];
// The segment's walk: row, the beat it moves on, the Check line it brings.
const STOPS = [
  { row: 0, beat: "b3", check: "Check: one accent fill per view" },
  // litt-allow: litt-shadow (UI data: P4's Check line names shadows; it is copy, not a class)
  { row: 2, beat: "b4", check: "Check: no shadow with an offset" },
  { row: 3, beat: "b5", check: "Check: 400 text · 500 titles · 600 labels" },
];

// The product beside the lockup (the shared split frame): 1024 wide.
const WIN_W = SPLIT.width;
const ROW_H = 88; // the List's row
const FOOT_H = 88; // the footer strip, a row tall
const WIN_H = 64 + RULES.length * ROW_H + FOOT_H; // title bar + rows + footer = 592

const ROW_IDS = RULES.map((_, i) => `profile-r${i}`);
const CHECK_IDS = STOPS.map((_, i) => `checkline-${i}`);

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} bg="lit" height={WIN_H}>
      <Window ct="profile" title="taste/profile.md" width={WIN_W} height={WIN_H}>
        <div class="relative h-full">
          {/* The raised segment (P12), laid out on the first stop (P1), inset 16 / 8;
              motion moves it down the rows by y. */}
          <El
            ct="current"
            class="absolute left-[16px] right-[16px] rounded-control bg-surface-2 shadow-raised"
            style={{ top: `${STOPS[0].row * ROW_H + 8}px`, height: `${ROW_H - 16}px` }}
          />

          {/* The rules: the List look (hairlines, title, mono id meta), rebuilt so a
              title can change ink on its own. */}
          {RULES.map((r, i) => (
            <El
              ct={`profile-r${i}`}
              data-ct-ui
              class={`relative flex items-center gap-[24px] px-[32px] ${i < RULES.length - 1 ? "border-b-2 border-line" : ""}`}
              style={{ height: `${ROW_H}px` }}
            >
              <El as="span" ct={`profile-t${i}`} class="font-sans text-[28px] text-fg-muted">
                {r.title}
              </El>
              <span class="ml-auto font-mono text-[26px] text-fg-subtle">{r.id}</span>
            </El>
          ))}

          {/* Footer strip: the current rule's Check line, mono, in the grey. The three
              lines share one slot; motion shows one at a time. */}
          <El
            ct="checkline"
            data-ct-ui
            class="absolute inset-x-0 bottom-0 border-t-2 border-line"
            style={{ height: `${FOOT_H}px` }}
          >
            {STOPS.map((s, i) => (
              <El
                as="span"
                ct={CHECK_IDS[i]}
                class="absolute inset-y-0 left-[32px] flex items-center font-mono text-[26px] text-fg-subtle"
              >
                {s.check}
              </El>
            ))}
          </El>
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // b1 — the name and the answer rise into the light (responsive): the label leads,
    // the statement masks up by lines, its summary follows once it has landed.
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.04", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // b2 — the product is placed: the scene's one expressive moment. Its rules load
    // after it, a 40ms cascade in reading order.
    m.enter("profile", "settle", { at: "b2" });
    m.enter(ROW_IDS, "rise", { at: "after:profile-0.3", stagger: "list" });

    // b3–b5 — the product acts: the raised segment walks the rules. It comes up under
    // P1, then glides (y, the responsive spring) to P4 and P9; the title it reaches
    // steps up to fg as it arrives and the one it left steps back (instant).
    m.enter("current", "fade", { at: "b3" });
    m.emphasize("profile-t0", "ink", { at: "b3" });
    STOPS.slice(1).forEach((stop, k) => {
      const from = STOPS[k].row;
      m.tween("current", { y: [from * ROW_H, stop.row * ROW_H] }, { at: stop.beat });
      m.emphasize(`profile-t${from}`, "dim", { at: `${stop.beat}+0.1` });
      m.emphasize(`profile-t${stop.row}`, "ink", { at: `${stop.beat}+0.1` });
    });

    // The footer follows the segment with that rule's Check line. Each swap is old
    // out, then new in (instant, opacity on small UI — never two lines in one slot),
    // and the new line rises its last 8px on the responsive spring: split so it is
    // legible from 0.1s while the small rise settles. The swaps sit 50 / 200ms after
    // their beats (while the glide lands) so each line holds 0.85s landed: ui-glance
    // asks 0.8s, the beats are 0.9s apart and a swap takes 0.2s.
    const SWAP_AT = [m.time("b3"), m.time("b4") + 0.05, m.time("b5") + 0.2];
    STOPS.forEach((_, i) => {
      const at = i === 0 ? SWAP_AT[0] : SWAP_AT[i] + 0.1;
      if (i > 0) m.exit(CHECK_IDS[i - 1], "fadeOut", { at: SWAP_AT[i], duration: "instant" });
      m.enter(CHECK_IDS[i], "fade", { at, duration: "instant", ease: "out" });
      m.tween(CHECK_IDS[i], { y: [8, 0] }, { at });
    });

    // The push holds the lockup's left edge still, as in the hook. Anchored on x 96 the
    // product (right edge at 1824) grows rightward, so the push stops at 1.016: the most
    // that keeps the window inside action-safe (1853px): 96 + 1728 × 1.016 = 1852.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
