import { scene, Stage, Safe, El, Headline, Title, Label, Path, cx } from "continuity";
import { DRIFT, HEAD_TOP, Lines, ResumeStill, UI, breakAfter } from "../lib/index.js";

// Trust: pull back out of the Codex session (resume's last frame, on machine-screen) to find
// it on "Your machine". Then what leaves it, physically: three mono chips — decisions, branch,
// commit (the note's data, never code, diffs or transcripts) — ride the hairline out of the
// panel into the Hypher card and become its row. The headline says what never travels.
// A diagram, not a screen: no sample-data caption.
//
// Layout, px inside <Safe> (1728 × 972): the headline on the film's top line and left edge;
// the machine panel a region (96) under it; the Hypher card hugs its title and the chip row,
// and the chip row sits on the screen's middle, so the hairline runs level from panel to chips.
// The card's right edge is 48 in from the safe edge: the 2% push (anchored on the headline's
// left edge) takes it to stage 1810, inside title-safe (1824).
const PANEL = { left: 0, top: 416, pad: 32 } as const;
const SCREEN = { w: 640, h: 360 } as const;
const PANEL_W = SCREEN.w + PANEL.pad * 2; // 704
const MID_Y = PANEL.top + PANEL.pad + SCREEN.h / 2; // 628: the screen's middle
const CARD_PAD = 48;
const TITLE_LINE = 56; // the title step's line
/**
 * The chip row: three chips drawn as the note's IdChip (lib/note.tsx: mono 30/40, 56 high, the
 * grey on surface-2 with a hairline), 16 apart — 506 wide in Geist Mono. Inlined only to carry
 * data-layout-allow-occlusion: on their way out they pass under the road's clip at the panel
 * edge, which the occlusion audit reads as the screen covering them.
 */
const ROW = { gap: 16, h: UI.chip } as const;
const HCARD = { w: 608, right: 1728 - 48 } as const; // 1680
const HCARD_LEFT = HCARD.right - HCARD.w; // 1072
const HCARD_H = CARD_PAD + TITLE_LINE + 32 + ROW.h + CARD_PAD; // 240
const HCARD_TOP = MID_Y + ROW.h / 2 + CARD_PAD - HCARD_H; // 464: the row centred on MID_Y
const ROW_LEFT = HCARD_LEFT + CARD_PAD; // 1120
const LINK = { x0: PANEL_W, x1: HCARD_LEFT } as const;
/**
 * The chips' road: a clip from the panel's right edge to the card's inner right edge, so they
 * come out of the machine (nothing shows over the panel) and travel on the hairline. 8 of air
 * above and below keeps the chips' hairline ring whole.
 */
const ROAD = { left: PANEL_W, right: HCARD.right - CARD_PAD, air: 8 } as const;
/** How far the row travels: from wholly inside the panel (its right end at the edge) to rest. */
const ROW_W = 506;
const TRAVEL = ROW_LEFT - (PANEL_W - ROW_W); // 922
export const CHIPS = ["chip-decisions", "chip-branch", "chip-commit"] as const;

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline
          ct="headline"
          class="absolute left-0"
          style={`top:${HEAD_TOP}px;width:1344px`}
        >
          <Lines lines={breakAfter(text.headline, "leaves")} />
        </Headline>

        <El
          ct="hypher-card"
          data-ct-ui
          class="absolute flex flex-col gap-[32px] rounded-surface bg-surface-1 shadow-raised"
          style={`left:${HCARD_LEFT}px;top:${HCARD_TOP}px;width:${HCARD.w}px;height:${HCARD_H}px;padding:${CARD_PAD}px`}
        >
          <Title ct="hypher-label" as="p">
            {text["hypher-label"]}
          </Title>
        </El>

        <div class="absolute" style={`left:${LINK.x0}px;top:${MID_Y - 8}px`}>
          <Path
            ct="link"
            d={`M 0 8 L ${LINK.x1 - LINK.x0} 8`}
            viewBox={`0 0 ${LINK.x1 - LINK.x0} 16`}
            width={LINK.x1 - LINK.x0}
            height={16}
            strokeWidth={2}
            stroke="var(--color-fg-subtle)"
          />
        </div>

        <El
          ct="machine"
          data-ct-ui
          class="absolute flex flex-col gap-[16px] rounded-surface bg-surface-1 shadow-raised"
          style={`left:${PANEL.left}px;top:${PANEL.top}px;padding:${PANEL.pad}px`}
        >
          <ResumeStill ct="machine-screen" width={SCREEN.w} />
          <Label ct="machine-label">{text["machine-label"]}</Label>
        </El>

        {/* After the panel in paint order: nothing opaque covers the chips; the road's clip at
            the panel edge is what hides them before they leave. */}
        <div
          class="absolute overflow-hidden"
          style={`left:${ROAD.left}px;top:${MID_Y - ROW.h / 2 - ROAD.air}px;width:${ROAD.right - ROAD.left}px;height:${ROW.h + 2 * ROAD.air}px`}
        >
          <div
            data-ct-ui
            class="absolute flex"
            style={`left:${ROW_LEFT - ROAD.left}px;top:${ROAD.air}px;gap:${ROW.gap}px`}
          >
            {CHIPS.map((id) => (
              <El
                ct={id}
                as="span"
                data-layout-allow-occlusion
                class={cx("inline-flex items-center rounded-control bg-surface-2 px-[16px] font-mono text-fg-muted shadow-hairline", UI.meta)}
                style={`height:${UI.chip}px`}
              >
                {text[id]}
              </El>
            ))}
          </div>
        </div>
      </Safe>
    </Stage>
  ),
  // JOIN IN: portal out from resume (1.0 s, via machine-screen). The pull-back is the move, so
  // the panel and screen are at rest from frame 0 and every entrance waits for `land`.
  motion: (m) => {
    // The one expressive moment: the statement, as the pull-back lands.
    m.enter("headline", "maskUp", {
      at: "b1",
      split: "lines",
      ease: "expressive",
    });
    m.enter("machine-label", "fade", { at: 1.2 });
    // The road: the hairline draws to Hypher (left → right), the card rises to meet it.
    m.enter("link", "draw", { at: "b2", duration: "slow", ease: "inOut" });
    m.enter(["hypher-card", "hypher-label"], "rise", { at: 1.8, stagger: "list" });
    // b3: what leaves. The chips come out of the machine one after another, the far one first
    // (list stagger from the end, so the gaps open a touch: lead → follow), ride the hairline
    // and settle into the card's row. A travel along a wire, not an entrance: inOut (the
    // cursor/playhead ease) over `linger` keeps a 922 px trip legible (≈ 55 px/frame at its
    // peak) and lands it by ~3.5, 0.9 s before the cut. They wait wholly behind the road's
    // clip at the panel edge; the instant opacity step only keeps the waiting chips out of the
    // audits (it happens while they are still hidden). kind "enter": they are the scene's last
    // entrance, so its settled frame is the full card.
    const chips = { at: "b3", stagger: { each: 0.04, from: "end" as const }, kind: "enter" as const };
    m.tween([...CHIPS], { opacity: [0, 1] }, { ...chips, duration: "instant", ease: "out" });
    m.tween([...CHIPS], { x: [-TRAVEL, 0] }, {
      ...chips,
      duration: "linger",
      ease: "inOut",
      // travel-too-far: this is the scene's content (data leaving the machine on the link),
      // not an entrance placed from 32 px; the clip makes the distance the road's length.
      allow: ["travel-too-far"],
    });
    // The hold: a 2% push anchored on the headline's left edge (stage x 96), from land to 3.6
    // on the film's ambient ease (DRIFT), then still for the plain cut into the end card.
    m.camera(
      { scale: [1, 1.02] },
      { at: "land", duration: 2.6, ease: DRIFT, origin: { x: 96, y: 262 } },
    );
  },
});
