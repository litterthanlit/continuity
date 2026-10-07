import { scene, Stage, Safe, El, Eyebrow, Headline, Serif, Emph, Pill, Path, Glow } from "continuity";

/**
 * The turn. Light arrives (aurora), the headline answers the hook's "see" with
 * "eyes", and the studio pipeline draws as a hairline rail with five stations.
 *
 * Layout: copy on one left edge in the upper half; the rail spans the content
 * width in the lower third. Pills are equal-width so their centres sit at even
 * steps (0/25/50/75/100%) and the first/last pill align with the content edges.
 */
const STEPS = ["plan", "check", "measure", "critique", "ship"] as const;
const PILL_W = 260;
const PILL_H = 64; // one step up from the kit pill (52px): this row is the film's map
const RAIL_Y = 724; // safe-local centre line of the rail (frame y ≈ 778 at 1080p, lower third)

// Camera: a slow push with a drift toward the outgoing push transition.
const CAM_SCALE = 1.02;
const CAM_X = -10; // gentle: a larger drift pushes the left-edge copy past action-safe

export default scene({
  view: ({ text, width }) => {
    // Copy sits on the shared <Safe> edge like every other scene; the probe judges
    // safe areas camera-neutral, so no compensation for the push is needed.
    const insetL = 0;
    const contentW = Math.round(width * 0.9);
    const step = (contentW - PILL_W) / (STEPS.length - 1);
    // Break the headline by meaning, after the first sentence.
    const cut = text.headline.indexOf(". ") + 1;
    const line1 = text.headline.slice(0, cut);
    const line2 = text.headline.slice(cut + 1);
    return (
      <Stage bg="aurora">
        <Glow ct="glow" color="accent" size={1100} x="72%" y="26%" opacity={0.22} />
        <Safe>
          <div class="absolute inset-y-0 right-0" style={{ left: `${insetL}px` }}>
            <div class="absolute left-0 top-[176px] flex flex-col gap-[30px]">
              <Eyebrow ct="eyebrow" class="text-muted">
                {text.eyebrow}
              </Eyebrow>
              <Headline ct="headline" size="h1">
                {line1}
                <br />
                <Emph text={line2} word="eyes.">
                  {(w) => <Serif ct="eyes">{w}</Serif>}
                </Emph>
              </Headline>
            </div>

            <div class="absolute left-0" style={{ top: `${RAIL_Y - PILL_H / 2}px`, width: `${contentW}px`, height: `${PILL_H}px` }}>
              <div class="absolute left-0 flex" style={{ top: `${PILL_H / 2 - 1}px` }}>
                <Path
                  ct="rail"
                  d={`M0 1 L${contentW} 1`}
                  viewBox={`0 0 ${contentW} 2`}
                  width={contentW}
                  height={2}
                  stroke="color-mix(in oklab, var(--color-fg) 22%, transparent)"
                  strokeWidth={2}
                />
              </div>
              {STEPS.map((id, i) => (
                <div class="absolute top-0" style={{ left: `${Math.round(i * step)}px`, width: `${PILL_W}px` }}>
                  <Pill ct={id} class="w-full justify-center h-[64px]! px-[28px]! text-[30px]">
                    {id === "plan" && (
                      // Sits exactly where <Pill dot="accent"> puts its dot (the slot is reserved,
                      // so the label never shifts); a soft accent halo makes it read as "on".
                      <El
                        ct="plan-dot"
                        as="span"
                        class="h-[14px] w-[14px] rounded-full bg-accent"
                        style={{ boxShadow: "0 0 18px 2px color-mix(in oklab, var(--color-accent) 70%, transparent)" }}
                      />
                    )}
                    {text[id]}
                  </Pill>
                </div>
              ))}
            </div>
          </div>
        </Safe>
      </Stage>
    );
  },
  motion: (m) => {
    // b1 — light has arrived; the answer to the hook.
    m.enter("eyebrow", "fadeBlur", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.12", split: "lines" });
    // b2 — the pipeline draws left → right; each station pops as the line reaches it
    // (0.14s steps track the inOut draw within ~70ms at every pill).
    m.enter("rail", "draw", { at: "b2" });
    m.enter([...STEPS], "scalePop", { at: "b2+0.17", stagger: 0.14 });
    // b3 — Plan switches on: chapter 01 starts and the push carries us into it.
    m.enter("plan-dot", "scalePop", { at: "b3" });
    m.emphasize("plan", "pulse", { at: "b3" });
    // Ambient life.
    m.loop("glow", { scale: 0.04 }, { period: 6 });
    m.camera({ scale: [1, CAM_SCALE], x: [0, CAM_X] });
  },
});
