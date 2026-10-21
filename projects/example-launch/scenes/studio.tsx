import { scene, Stage, Safe, El, Label, Headline, Emph, Tag, Path } from "continuity";

/**
 * The turn. litt's one light arrives from the top (bg="lit"). The statement
 * rises in the grey and its answer, "eyes.", steps up to fg — the hook ended
 * with only "see" in fg, so the two words rhyme by ink. Below, the studio
 * pipeline: a hairline rail with five stations; "Plan" takes focus (the accent
 * as a focus ring) and the push carries us into it.
 *
 * Layout: the lockup on the safe left edge in the upper half, the rail across
 * the content width in the lower third. Stations sit at their natural width,
 * the first and last on the content edges.
 */
const STEPS = ["plan", "check", "measure", "critique", "ship"] as const;
const RAIL_Y = 724; // safe-local centre line of the rail (frame y ≈ 778, the lower third)
const TAG_H = 56;
const RAIL_W = 1536;

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
      <Stage bg="lit">
        <Safe>
          <div class="absolute left-0 top-[240px] flex flex-col">
            <Label ct="label">{text.label}</Label>
            <Headline ct="headline" class="mt-[8px] text-fg-muted">
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
                  <Tag ct={id}>{text[id]}</Tag>
                </div>
              ))}
            </div>
          </div>
        </Safe>
      </Stage>
    );
  },
  motion: (m) => {
    // b1 — the answer to the hook, rising into the light: the scene's one moment.
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    // b2 — "eyes." takes its ink.
    m.emphasize("eyes", "ink", { at: "b2" });
    // b3 — the pipeline draws left → right; the stations rise in reading order along it.
    m.enter("rail", "draw", { at: "b3" });
    m.enter([...STEPS], "rise", { at: "b3+0.1", stagger: "list" });
    // b4 — Plan takes focus: chapter 01 starts.
    m.emphasize("plan", "ink", { at: "b4" });
    m.enter("plan-focus", "fade", { at: "b4", duration: "instant", ease: "out" });
    // Anchored on the lockup's left edge, like the hook's, so the cut between them is still.
    m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 540 } });
  },
});
