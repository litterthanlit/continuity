import { scene, Stage, Safe, Stack, Label, Headline, Input } from "continuity";
import { HEAD_TOP, PANE } from "../lib/index.js";

// The pain, before the answer. The film's layout system from frame 1: the statement on the
// headline line (HEAD_TOP, the left edge every product scene shares), and the Codex prompt
// on the row the handoff panes use later (PANE.top), so the film's first agent sits where
// Codex will sit again. Light page, solid: the smoke is the turn's answer.
const PROMPT_WIDTH = 1120;

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <Headline ct="headline" class="absolute left-0 whitespace-nowrap" style={`top:${HEAD_TOP}px`}>
          {text.headline}
        </Headline>
        {/* The label's lockup is 8 to the field's edge: the focus ring draws 8 outside the
            field's box, so the Stack's gap is 16 (8 of it is the ring). */}
        <Stack gap={16} class="absolute left-0" style={`top:${PANE.top}px`}>
          <Label ct="agent">{text.agent}</Label>
          <Input ct="prompt" value={text["prompt-text"]} width={PROMPT_WIDTH} icon={false} focus />
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
    // The push, held on the statement's left edge (stage x 96, y 54 + HEAD_TOP + half the line).
    // Cut on action: it eases in from frame 1 and is still accelerating at the cut, so the
    // turn's statement rising on its frame 0 lands on movement (an ease-in, not inOut).
    m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 54 + HEAD_TOP + 56 }, ease: { type: "bezier", p: [0.4, 0, 0.9, 0.85] } });
  },
});
