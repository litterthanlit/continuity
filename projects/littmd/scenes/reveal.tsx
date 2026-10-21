import { scene, El, Window } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 01 · Reveal — the answer to the hook, in the light: litt.md names itself, and
// its taste is on screen as what it is, a file of rules. The profile window holds
// five real rules from taste/profile.md (title + mono P-id), on the List's 88px
// rhythm. litt on its own surface: titles in the grey, so the one rule that
// takes the raised segment (P12) steps up to fg by ink alone; its Check line
// lands in the footer strip.

// UI data: real litt.md rules (taste/profile.md), imagery not copy.
const RULES = [
  { title: "Light, not paint", id: "P1" },
  { title: "Glass is earned", id: "P3" },
  { title: "Depth without drop shadows", id: "P4" },
  { title: "Weight by role", id: "P9" },
  { title: "Selected is a raised segment", id: "P12" },
];
const CURRENT = 3; // "Weight by role" — its check is the footer line
const CHECK = "Check: 400 text · 500 titles · 600 labels";

// The product beside the lockup (the shared split frame): 1024 wide.
const WIN_W = SPLIT.width;
const ROW_H = 88; // the List's row
const FOOT_H = 88; // the footer strip, a row tall
const WIN_H = 64 + RULES.length * ROW_H + FOOT_H; // title bar + rows + footer = 592

const ROW_IDS = RULES.map((_, i) => `profile-r${i}`);

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} bg="lit" height={WIN_H}>
      <Window ct="profile" title="taste/profile.md" width={WIN_W} height={WIN_H}>
        <div class="relative h-full">
          {/* The raised segment (P12) behind the current rule's row, inset 16 / 8. */}
          <El
            ct="current"
            class="absolute left-[16px] right-[16px] rounded-control bg-surface-2 shadow-raised"
            style={{ top: `${CURRENT * ROW_H + 8}px`, height: `${ROW_H - 16}px` }}
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

          {/* Footer strip: the rule's Check line, mono, in the grey. */}
          <div
            class="absolute inset-x-0 bottom-0 flex items-center border-t-2 border-line px-[32px]"
            style={{ height: `${FOOT_H}px` }}
          >
            <El as="span" ct="checkline" class="font-mono text-[26px] text-fg-subtle">
              {CHECK}
            </El>
          </div>
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

    // b3 — one rule is selected: the raised segment comes up under "Weight by role",
    // its title steps up to fg (instant), and its Check line lands in the footer.
    m.enter("current", "fade", { at: "b3" });
    m.emphasize(`profile-t${CURRENT}`, "ink", { at: "b3" });
    m.enter("checkline", "fade", { at: "b3+0.1" });

    // The push holds the lockup's left edge still, as in the hook. Anchored on x 96 the
    // product (right edge at 1824) grows rightward, so the push stops at 1.016: the most
    // that keeps the window inside action-safe (1853px): 96 + 1728 × 1.016 = 1852.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
