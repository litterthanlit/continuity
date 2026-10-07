import { scene, Stage, Headline, Serif, Emph, El } from "continuity";
import { TypeStack } from "../lib/layout.js";

/**
 * A miniature frame of this very video — the contact sheet the agent reads.
 * Decorative (data-layout-ignore): the mini copy is imagery, not reading text.
 */
function Tile({ ct, lines, accent, flagged }: { ct: string; lines: [string, string]; accent?: string; flagged?: boolean }) {
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
        style="background:radial-gradient(70% 40% at 20% 0%,color-mix(in oklab,var(--color-accent) 30%,transparent),transparent 70%),radial-gradient(60% 35% at 90% 5%,color-mix(in oklab,var(--color-accent-2) 18%,transparent),transparent 70%)"
      />
      <div class="absolute left-[18px] top-[150px] font-display text-[30px] font-semibold leading-[0.95] tracking-[-0.04em] text-fg">
        {lines[0]}
        <br />
        {accent ? (
          <>
            {lines[1].replace(accent, "")}
            <span class="font-serif font-normal italic tracking-normal text-accent">{accent}</span>
          </>
        ) : (
          lines[1]
        )}
      </div>
    </El>
  );
}

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <TypeStack
        below={
          <div class="grid w-fit grid-cols-3 gap-[18px]">
            <Tile ct="t1" lines={["Motion is", "a craft."]} accent="craft." />
            <Tile ct="t2" lines={["Agents can", "write it."]} />
            <Tile ct="t3" lines={["But they", "can't see it."]} />
            <Tile ct="t4" lines={["So we gave", "them eyes."]} accent="eyes." />
            <Tile ct="t5" lines={["Every frame,", "checked."]} flagged />
            <Tile ct="t6" lines={["Continuity", "as code."]} />
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
    m.enter(["t1", "t2", "t3", "t4", "t5", "t6"], "scalePop", { at: "b2", stagger: { each: "grid", from: "center" } });
    m.emphasize("t5", "pulse", { at: "b2+0.9" });
    m.camera({ scale: [1, 1.04], y: [0, -24] });
  },
});
