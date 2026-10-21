import { scene, El, Card, Window, Terminal, Button } from "continuity";
import { Chapter, SPLIT } from "../lib/chapter.js";

// 04 · Registry — install the components, don't copy them. The right column stacks the
// host app's terminal (the shadcn command types on, the ✔ lines land) and, one block gap
// below, a flat preview card holding what it installed: litt's button, primary beside
// secondary, with its registry version. The primary button is the frame's one accent fill.

// UI data: verbatim from the storyboard notes.
const CMD = "npx shadcn add @litt/button";
const OUT = ["✔ components/litt/button.tsx", "✔ tokens as --litt-*, host untouched"];
const VERSION = "@litt/button 2026.10.20";

// The split frame's product column, 1024 wide: the terminal window, a 32px block gap,
// the preview card (48px padding around one 88px control row).
const W = SPLIT.width;
const GAP = 32;
const TERM_H = 320;
const CARD_H = 184;
const H = TERM_H + GAP + CARD_H; // 536

export default scene({
  view: ({ text }) => (
    <Chapter label={text.label} headline={text.headline} sub={text.sub} height={H}>
      <div class="flex flex-col" style={{ gap: `${GAP}px` }}>
        <Window ct="term" title="~/app" width={W} height={TERM_H}>
          <div class="flex flex-col px-[48px] py-[40px]">
            {/* The kit Terminal's styling, with the prompt outside the typed span so it is
                already waiting when the push lands. */}
            <El ct="cmd" data-ct-ui class="whitespace-pre font-mono text-[28px] leading-[1.6] text-fg">
              <span class="text-fg-subtle">$</span> <El as="span" ct="cmd-l0">{CMD}</El>
            </El>
            <Terminal ct="out" class="mt-[32px]" lines={OUT} />
          </div>
        </Window>

        {/* What the command installed, rendered in the host. */}
        <Card ct="preview" class="flex items-center gap-[16px]" style={{ width: `${W}px`, height: `${CARD_H}px` }}>
          <Button ct="primary" variant="primary">
            Get started
          </Button>
          <Button ct="secondary">Read the docs</Button>
          <El as="span" ct="version" class="ml-auto font-mono text-[26px] text-fg-subtle">
            {VERSION}
          </El>
        </Card>
      </div>
    </Chapter>
  ),
  motion: (m) => {
    // The push brings the terminal in with its prompt waiting; the lockup comes up.
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.2" });

    // b2 · the command types on; b3 · the install lands, line by line.
    m.type("cmd-l0", { at: "b2", cps: 24 });
    m.enter(["out-l0", "out-l1"], "rise", { at: "b3", stagger: "list" });

    // b4 · the installed component is placed in the host: the scene's one moment.
    m.enter("preview", "settle", { at: "b4" });

    // The push holds the lockup's left edge still (origin on the safe edge), so the product
    // column grows rightwards: past 1.017 the window's right edge leaves action-safe
    // (96 + 1728 × s > 1853, probe camera-safe). 1.016, as in the reveal.
    m.camera({ scale: [1, 1.016] }, { origin: { x: 96, y: 540 } });
  },
});
