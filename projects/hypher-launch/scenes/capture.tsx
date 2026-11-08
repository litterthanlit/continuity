import { scene, ctId, cx, El, Headline, Path, Safe, Stage } from "continuity";
import { CAPTURE_ROW_H, CAPTURE_TOP, COPY_WIDTH, DISPLAY, DRIFT, IdChip, Lines, NoteStill, REGION, SampleCaption, UI, breakAfter } from "../lib/index.js";

/**
 * Step one: capture the project as it is. One block centred on the frame's centre line
 * (CAPTURE_TOP, lib/layout.ts): the headline (column A–C), a region, then the capture card in the
 * copy column and the note-tile (the note scene's frame 0 at 0.3) on the safe right edge, on the
 * card's row, tied to it by a 2px hairline. The tile is the portal into `note`.
 *
 *   card  0 → 768 (COPY_WIDTH), top ROW, 324 high — the tile's height, so the two share edges
 *   tile  1152 → 1728 (safe right edge), top ROW, 576 × 324; its label 8 under it
 *   link  card's right edge → tile's left edge, through both centres
 */
const ROW = CAPTURE_TOP + 2 * DISPLAY + REGION; // 464
const TILE = { left: 1152, width: 576, height: CAPTURE_ROW_H } as const;
const LINK_Y = ROW + TILE.height / 2;
/** The card's translate-only arrival (2× litt's travel): the carry's speed, continued on the light page. */
const ARRIVE = 64;
/**
 * The push's fixed point: the frame's centre line across, the headline's top line down. Not the
 * headline's left edge: the block spans the safe width, so a push held at x 96 carries the tile
 * past action-safe on the right (1859 > 1853). Held at the centre, both edges stay inside (79 and
 * 1841); the headline drifts 17px over 2.3s into a portal (a continuous move, not a hard cut, so
 * nothing snaps back).
 */
const PUSH_ORIGIN = { x: 960, y: 54 + CAPTURE_TOP };

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline ct="headline" class="absolute left-0" style={`top:${CAPTURE_TOP}px;width:${COPY_WIDTH}px`}>
          <Lines lines={breakAfter(text.headline, "Capture")} />
        </Headline>

        {/* The capture card: a multi-line field with the typed constraint, and the dropped file. */}
        <El
          ct="capture"
          data-ct-ui
          class="absolute left-0 flex flex-col justify-between rounded-surface bg-surface-1 p-[48px] shadow-raised"
          style={`top:${ROW}px;width:${COPY_WIDTH}px;height:${TILE.height}px`}
        >
          <div class="h-[132px] rounded-control bg-surface-1 px-[32px] py-[24px] shadow-field">
            <span class={cx("relative inline-flex items-center font-sans", UI.value)}>
              <El
                as="span"
                ct="capture-text"
                data-ct-caret={ctId("capture-caret")}
                data-ct-tape={text["capture-text"]}
                class="text-fg"
              >
                {text["capture-text"]}
              </El>
              <El as="span" ct="capture-caret" data-layout-ignore class="ml-[4px] inline-block h-[44px] w-[3px] bg-focus" />
            </span>
          </div>
          <div class="flex">
            <IdChip ct="file">{text.file}</IdChip>
          </div>
        </El>

        {/* The link: a hairline from the card to the note it feeds. */}
        <div class="absolute" style={`left:${COPY_WIDTH}px;top:${LINK_Y - 1}px`}>
          <Path
            ct="link"
            d={`M1 1 H${TILE.left - COPY_WIDTH - 1}`}
            viewBox={`0 0 ${TILE.left - COPY_WIDTH} 2`}
            width={TILE.left - COPY_WIDTH}
            height={2}
            stroke="var(--color-line-strong)"
            strokeWidth={2}
          />
        </div>

        {/* The portal: the note scene's first frame, and its id under it (8, a lockup). */}
        <div class="absolute flex flex-col gap-[8px]" style={`left:${TILE.left}px;top:${ROW}px`}>
          <NoteStill ct="note-tile" width={TILE.width} />
          <El as="p" ct="tile-label" class={cx("font-mono text-fg-muted", UI.meta)}>
            {text["tile-label"]}
          </El>
        </div>

        <SampleCaption ct="caption">{text.caption}</SampleCaption>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // JOIN IN (carry left from turn): the card is there at full opacity on frame 0 and travels
    // the carry's way by translate only, so the carry's speed lands on something.
    m.tween("capture", { x: [ARRIVE, 0] }, { at: 0 });
    // b1: the statement lands — the scene's one expressive moment.
    m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    // The note it feeds follows the card in, the same way; the honesty line after it.
    m.enter(["note-tile", "tile-label"], "slideLeft", { at: 0.3, stagger: "list" });
    m.enter("caption", "fade", { at: 0.5 });
    // The capture: typed into the field, then the dropped chat export.
    m.type("capture-text", { at: 0.6, cps: 20 });
    m.enter("file", "rise", { at: 1.5 });
    // b2: the capture flows into the note — the link draws card → tile, and the tile takes it.
    m.enter("link", "draw", { at: "b2", duration: "slow", ease: "inOut" });
    // The tile takes it as the line arrives (≈ 2.1), at rest well before the portal (2.9).
    m.emphasize("note-tile", "press", { at: "after:link-0.1" });
    // The hold's ambient life: a 2% push (PUSH_ORIGIN), at rest as the portal starts
    // (2.9). The portal measures the tile as drawn then, so its rig stays locked to it; the
    // camera does not move during the portal.
    const portalAt = m.time("end") - 0.9;
    m.camera({ scale: [1, 1.02] }, { at: 0.6, duration: portalAt - 0.6, ease: DRIFT, origin: PUSH_ORIGIN });
    // JOIN OUT: the portal through note-tile (0.9 s from 2.9). Nothing exits — the rest flies past
    // the camera.
  },
});
