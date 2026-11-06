import { scene, Stage, Safe, El, Label, Headline, Emph, Tag, Path } from "continuity";
import { SCENES } from "../lib/film.js";

/**
 * The turn: a moving colour field fills the frame (bg="gradient"), the first colour
 * after the hook's solid canvas. On the field the type takes one ink, fg (the grey
 * falls under 3:1 on the field's cobalt — docs/decisions/0011), so the answer cannot
 * step up by ink the way the hook's "see" stepped down. It lands on its own beat
 * instead: the statement rises without "eyes.", and the word arrives at b2 — the
 * rhyme with "see" moves from ink to timing. Below, the studio pipeline: a hairline
 * rail with five stations; "Plan" takes focus (the accent as a focus ring) and the
 * camera goes through it (a portal) into chapter 01.
 *
 * Layout: the lockup on the safe left edge in the upper half, the rail across
 * the content width in the lower third. Stations sit at their natural width,
 * the first and last on the content edges.
 */
const STEPS = ["plan", "check", "measure", "critique", "ship"] as const;
const RAIL_Y = 724; // safe-local centre line of the rail (frame y ≈ 778, the lower third)
const TAG_H = 56;
const RAIL_W = 1536;
/** The portal into plan: this scene's storyboard transition, so the two never drift apart. */
const PORTAL_S = SCENES.find((s) => s.id === "studio")!.transition!.duration!;

export default scene({
  view: ({ text }) => {
    // The rail ends 192px short of the safe right edge: the push is anchored on the
    // left edge, so the right end grows by 3% of its length and must stay action-safe.
    const contentW = RAIL_W;
    // Break the statement by meaning, after the first sentence.
    const cut = text.headline.indexOf(". ") + 1;
    const line1 = text.headline.slice(0, cut);
    const line2 = text.headline.slice(cut + 1);
    return (
      <Stage bg="gradient" gradient="accent">
        <Safe>
          <div class="absolute left-0 top-[240px] flex flex-col">
            <Label ct="label" class="text-fg">{text.label}</Label>
            <Headline ct="headline" class="mt-[8px]">
              {line1}
              <br />
              <Emph text={line2} word="eyes.">
                {(w) => (
                  <El as="span" ct="eyes">
                    {w}
                  </El>
                )}
              </Emph>
            </Headline>
          </div>

          <div class="absolute left-0" style={{ top: `${RAIL_Y - TAG_H / 2}px`, width: `${contentW}px`, height: `${TAG_H}px` }}>
            <div class="absolute inset-x-0" style={{ top: `${TAG_H / 2 - 1}px` }}>
              <Path
                ct="rail"
                d={`M0 1 L${contentW} 1`}
                viewBox={`0 0 ${contentW} 2`}
                width={contentW}
                height={2}
                stroke="var(--color-line-strong)"
                strokeWidth={2}
              />
            </div>
            <div class="absolute inset-0 flex items-center justify-between">
              {STEPS.map((id) => (
                <div class="relative">
                  {id === "plan" && (
                    // litt's focus ring (a canvas gap, then the focus colour): the accent as focus.
                    <El ct="plan-focus" class="absolute inset-0 rounded-control shadow-focus" data-layout-ignore />
                  )}
                  {/* Plan is the portal's tile: drawn at 16:9 (100 × 56) so the window the next
                      scene opens in is the tile's own edge at every frame (other shapes open as
                      a crop whose edge drifts inside the tile's border — at 19× it shows). */}
                  <Tag ct={id} class={id === "plan" ? "w-[100px] justify-center" : undefined}>
                    {id === "plan" ? (
                      <El as="span" ct="plan-word">
                        {text[id]}
                      </El>
                    ) : (
                      text[id]
                    )}
                  </Tag>
                </div>
              ))}
            </div>
          </div>
        </Safe>
      </Stage>
    );
  },
  motion: (m) => {
    // b1 (frame 0) — the hook cuts onto this entrance: the answer starts rising on the
    // cut's first frame, so the eye goes from "see" straight to it. The scene's one moment.
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    // b2 — "eyes." lands on its own beat: the word the hook could not do.
    m.enter("eyes", "fade", { at: "b2" });
    // b3 — the pipeline draws left → right; the stations rise in reading order along it.
    m.enter("rail", "draw", { at: "b3" });
    m.enter([...STEPS], "rise", { at: "b3+0.1", stagger: "list" });
    // b4 — Plan takes focus: chapter 01 starts, and the portal goes through this tile.
    m.emphasize("plan", "ink", { at: "b4" });
    m.enter("plan-focus", "fade", { at: "b4", duration: "instant", ease: "out" });
    // The ring has pointed: it clears as the camera starts into the tile, so the tile
    // (not a 19× focus ring) is the window the next scene opens in.
    m.exit("plan-focus", "fadeOut", { at: `end-${PORTAL_S}` });
    // Its word steps out just before, at the instant tier: the tile the camera goes through is
    // a clean window onto chapter 01, not "Plan" ghosted over it.
    m.exit("plan-word", "fadeOut", { at: `end-${PORTAL_S + 0.1}`, duration: "instant" });
    // Anchored on the lockup's left edge, like the hook's, so the cut between them is still.
    // It lands as the portal starts: the portal is the scene's move (the tile is measured at
    // that instant, so a camera still moving under it would slide the window off the tile).
    m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 540 }, duration: m.time("end") - PORTAL_S });
  },
});
