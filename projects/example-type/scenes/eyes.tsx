import type { ComponentChildren } from "preact";
import { scene, Stage, Headline, Serif, Emph, El } from "continuity";
import { TypeStack } from "../lib/layout.js";

/**
 * A miniature frame of this very video — the contact sheet the agent reads, so
 * each tile mirrors its real scene (marker, blur, check, the centred end card).
 * Decorative (data-layout-ignore): the mini copy is imagery, not reading text.
 */
function Tile({ ct, flagged, center, children }: { ct: string; flagged?: boolean; center?: boolean; children: ComponentChildren }) {
  return (
    <El
      ct={ct}
      data-layout-ignore
      class={
        "relative h-[391px] w-[220px] overflow-hidden rounded-lg border bg-bg " +
        (flagged ? "border-accent ring-2 ring-accent/40" : "border-border")
      }
    >
      <div
        class="absolute inset-0"
        style={
          center
            ? "background:radial-gradient(60% 34% at 50% 50%,color-mix(in oklab,var(--color-accent) 32%,transparent),transparent 72%)"
            : "background:radial-gradient(70% 40% at 20% 0%,color-mix(in oklab,var(--color-accent) 30%,transparent),transparent 70%),radial-gradient(60% 35% at 90% 5%,color-mix(in oklab,var(--color-accent-2) 18%,transparent),transparent 70%)"
        }
      />
      {center ? (
        <div class="absolute inset-x-0 top-[158px] flex flex-col items-center gap-[6px]">{children}</div>
      ) : (
        <div class="absolute left-[18px] top-[150px] font-display text-[30px] leading-[0.9] text-fg">{children}</div>
      )}
    </El>
  );
}

const accent = (w: string) => <span class="font-serif italic ct-accent text-accent">{w}</span>;

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <TypeStack
        below={
          <div class="grid w-fit grid-cols-3 gap-[18px]">
            <Tile ct="t1">
              Motion is
              <br />a {accent("craft.")}
            </Tile>
            <Tile ct="t2">
              Agents can
              <br />
              <span class="relative inline-block">
                <span class="absolute inset-x-[-2px] bottom-[2px] h-[11px] rounded-[2px] bg-accent/60" />
                <span class="relative">write</span>
              </span>{" "}
              it.
            </Tile>
            <Tile ct="t3">
              But they
              <br />
              <span class="text-muted">can’t</span>
              <br />
              <span style="filter:blur(2px);opacity:.5">see</span> it.
            </Tile>
            <Tile ct="t4">
              So we gave
              <br />
              them {accent("eyes.")}
            </Tile>
            <Tile ct="t5" flagged>
              Every
              <br />
              frame,
              <span class="mt-[3px] flex items-center gap-[6px]">
                checked.
                <svg class="text-accent" width={28} height={24} viewBox="0 0 110 96" fill="none" aria-hidden="true">
                  <path d="M6 52 L38 84 L104 12" stroke="currentColor" stroke-width={16} stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </Tile>
            <Tile ct="t6" center>
              <span class="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">Open source</span>
              <span class="font-display text-[30px] leading-[0.9] text-fg">Continuity</span>
              <span class="font-sans text-[11px] text-muted">Motion design, as code.</span>
            </Tile>
          </div>
        }
      >
        <Headline ct="l1" size="h1">{text.l1}</Headline>
        <Headline ct="l2" size="h1">
          <Emph text={text.l2} word="eyes.">{(w) => <Serif class="text-accent">{w}</Serif>}</Emph>
        </Headline>
      </TypeStack>
    </Stage>
  ),
  motion: (m) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b1+0.15", split: "lines" });
    // The 3×2 grid opens from its centre column, then the top corners, then the bottom ones
    // (a list stagger from "center" would count t1…t6 in a row and pop the corners t3/t4 first).
    m.enter(["t2", "t5"], "scalePop", { at: "b2", stagger: 0 });
    m.enter(["t1", "t3"], "scalePop", { at: "b2+0.05", stagger: 0 });
    m.enter(["t4", "t6"], "scalePop", { at: "b2+0.1", stagger: 0 });
    m.emphasize("t5", "pulse", { at: "b2+0.9" });
    m.camera({ scale: [1, 1.04], y: [0, -24] });
  },
});
