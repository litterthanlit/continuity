import { Card, Headline, scene, Safe, Stage, Stat, Typed } from "continuity";

// One phrase, one UI. The lead-in never moves; the ending is deleted back to it and retyped on
// each beat. The card that proves the claim snaps up as the phrase lands and leaves as it is
// deleted, so claim and proof always change together.
const PROOF = ["rank", "demos", "cited"] as const;
const BEATS = ["b1", "b2", "b3"];

export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Safe class="flex flex-col justify-center gap-[64px]">
        <Headline ct="line" balance={false} class="whitespace-nowrap">
          <span class="text-fg-muted">{text.lead}</span> <Typed ct="end" />
        </Headline>
        <div class="grid w-[640px]">
          {/* UI data: the cards are imagery, not copy. */}
          <Card ct="rank" class="[grid-area:1/1] p-[48px]">
            <Stat ct="rank-v" value={1} prefix="#" label="Average position" size="display" />
          </Card>
          <Card ct="demos" class="[grid-area:1/1] p-[48px]">
            <Stat ct="demos-v" value={0} label="Demos booked this week" size="display" />
          </Card>
          <Card ct="cited" class="[grid-area:1/1] p-[48px]">
            <Stat ct="cited-v" value={0} label="AI answers citing you" size="display" />
          </Card>
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m, { text }) => {
    const phrases = [text.e0, text.e1, text.e2];
    m.retype("end", [phrases[0], { text: phrases[1], at: "b2" }, { text: phrases[2], at: "b3" }], { at: "b1", caret: "end-caret" });
    PROOF.forEach((id, i) => {
      // The phrase is typed at 22 keys a second; the card lands with its last key.
      const typed = m.time(BEATS[i]) + Math.round((phrases[i].length / 22) * 100) / 100;
      m.tween(id, { y: [48, 0], opacity: [0, 1] }, { at: typed, duration: "snap", ease: "steep", kind: "enter" });
      if (i < PROOF.length - 1) m.tween(id, { opacity: [1, 0] }, { at: `${BEATS[i + 1]}-0.3`, duration: "instant", ease: "out", kind: "exit" });
    });
    m.counter("demos-v", { from: 0, to: 24, at: m.time("b2") + 0.6, duration: "slow" });
    m.counter("cited-v", { from: 0, to: 89, at: m.time("b3") + 0.5, duration: "slow" });
  },
});
