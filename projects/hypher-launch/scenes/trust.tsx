import {
  scene,
  Stage,
  Safe,
  El,
  Headline,
  Title,
  Caption,
  Label,
  Path,
} from "continuity";
import { HEAD_TOP, Lines, ResumeStill, breakAfter } from "../lib/index.js";

// Trust: pull back out of the Codex session (resume's last frame, on machine-screen) to find
// it on "Your machine". Only decisions and ids travel along the hairline to Hypher; the
// headline says what never does. A diagram, not a screen: no sample-data caption.
//
// Layout, px inside <Safe> (1728 × 972): the headline on the film's top line and left edge;
// the machine panel a region (96) under it; the Hypher card on the safe right edge, centred
// on the screen's middle, so the hairline runs level from panel to card.
const PANEL = { left: 0, top: 416, pad: 32 } as const;
const SCREEN = { w: 640, h: 360 } as const;
const PANEL_W = SCREEN.w + PANEL.pad * 2; // 704
const MID_Y = PANEL.top + PANEL.pad + SCREEN.h / 2; // 628: the screen's middle
const HCARD = { w: 512, h: 200 } as const;
const HCARD_LEFT = 1728 - HCARD.w; // 1216, on the safe right edge
const LINK = { x0: PANEL_W, x1: HCARD_LEFT } as const;

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
          ct="machine"
          data-ct-ui
          class="absolute flex flex-col gap-[16px] rounded-surface bg-surface-1 shadow-raised"
          style={`left:${PANEL.left}px;top:${PANEL.top}px;padding:${PANEL.pad}px`}
        >
          <ResumeStill ct="machine-screen" width={SCREEN.w} />
          <Label ct="machine-label">{text["machine-label"]}</Label>
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
          ct="hypher-card"
          data-ct-ui
          class="absolute flex flex-col justify-center gap-[8px] rounded-surface bg-surface-1 p-[48px] shadow-raised"
          style={`left:${HCARD_LEFT}px;top:${MID_Y - HCARD.h / 2}px;width:${HCARD.w}px;height:${HCARD.h}px`}
        >
          <Title ct="hypher-label" as="p">
            {text["hypher-label"]}
          </Title>
          <Caption ct="leaves" class="whitespace-nowrap">
            {text.leaves}
          </Caption>
        </El>
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
    // What leaves the machine: the hairline draws to Hypher (left → right), the card is there
    // to meet it, its title then the only things that travel.
    m.enter("link", "draw", { at: "b2", duration: "slow", ease: "inOut" });
    m.enter(["hypher-card", "hypher-label", "leaves"], "rise", {
      at: 1.8,
      stagger: "list",
    });
    // The hold: a 2% push anchored on the headline's left edge (stage x 96), from land to 3.6,
    // then still for the plain cut into the end card.
    m.camera(
      { scale: [1, 1.02] },
      { at: "land", duration: 2.6, ease: "inOut", origin: { x: 96, y: 262 } },
    );
  },
});
