import { scene, Stage, Safe, Stack, Label, Headline, Input } from "continuity";
import { DISPLAY, HOOK_TOP, PROMPT, REGION, UI } from "../lib/index.js";

// The pain, before the answer. The film's layout system from frame 1 (lib/layout.ts): one block
// on the left edge, centred on the frame's centre line (HOOK_TOP) — the statement, a region (96),
// then the Codex prompt under its label, the prompt's type at the film's UI size (36). Light
// page, solid: the smoke is the turn's answer.
const PROMPT_TOP = HOOK_TOP + DISPLAY + REGION;

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline ct="headline" class="absolute left-0 whitespace-nowrap" style={`top:${HOOK_TOP}px`}>
          {text.headline}
        </Headline>
        {/* The label's lockup is 8 to the field's edge: the focus ring draws 8 outside the
            field's box, so the Stack's gap is 16 (8 of it is the ring). */}
        <Stack gap={PROMPT.labelGap} class="absolute left-0" style={`top:${PROMPT_TOP}px`}>
          <Label ct="agent">{text.agent}</Label>
          {/* min-h lifts the kit's 88 field to 104 for 36px type (min-height wins over height). */}
          <Input ct="prompt" value={text["prompt-text"]} width={PROMPT.width} icon={false} focus class={`min-h-[${PROMPT.height}px] ${UI.value}`} />
        </Stack>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // Show, then tell: the prompt is there and typing before the statement lands.
    m.enter("agent", "fade", { at: "b1" });
    m.enter("prompt", "rise", { at: "b1+0.04" });
    // The caret holds solid while keys are pressed and blinks from the last one into the cut.
    // 24 cps from 0.25 s: the typed line is readable (retype-hold) before the cut at 3.4 s.
    m.type("prompt-text", { at: 0.25, cps: 24 });
    // The scene's one expressive moment: the statement. 0.2 s after b2, so the prompt leads
    // longer ("Again: hash tok…" is on screen) before the line tells.
    m.enter("headline", "maskUp", { at: "b2+0.2", split: "lines", ease: "expressive" });
    // The push, held on the statement's left edge (stage x 96, y 54 + HOOK_TOP + half the line).
    // Cut on action: it eases in from frame 1 and is still accelerating at the cut, so the
    // turn's statement rising on its frame 0 lands on movement (an ease-in, not inOut).
    m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 54 + HOOK_TOP + DISPLAY / 2 }, ease: { type: "bezier", p: [0.4, 0, 0.9, 0.85] } });
  },
});
