import { Cycle, Headline, scene, Safe, Stage } from "continuity";

// The slot flips through stand-ins on the beats and lands on the name. It ends the line, so the
// room a short word leaves in the slot is never seen.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Safe class="flex items-center">
        <Headline ct="headline" balance={false} class="whitespace-nowrap">
          <span class="text-fg-muted">{text.lead}</span> <Cycle ct="tool" words={[text.w0, text.w1, text.w2, text.w3]} />
        </Headline>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("headline", "wipeRight", { at: 0.1, duration: "snap", ease: "steep" });
    m.cycle("tool", { times: ["b1", "b2", "b3"], ease: "steep", duration: "snap" });
  },
});
