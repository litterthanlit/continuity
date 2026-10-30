import { scene, Stage, Center, Row, Stack, Headline, Body, Shape } from "continuity";
import { MARK } from "../lib/mark.js";

// The lockup, flat and centred: litt's one centred statement, the logo film's last word. A match
// cut: the mark opens at the neon mark's size and place, holds a beat, then flies into the lockup.
// The wordmark types on the "and", the line wipes on the bar; the camera's push carries the hold.
// The moves on the music ease out, so their fastest frame is the beat.
// MATCH: the mark's offset and scale that put it where the neon shot left it (centre, ~576px).
const MATCH = { x: 281, scale: 3.84 };
export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Center>
        <Row gap={48}>
          <Shape ct="mark" d={MARK} viewBox="0 0 240 240" width={176} />
          <Stack gap={16} class="items-start text-left">
            <Headline ct="word" class="whitespace-nowrap">{text.word}</Headline>
            <Body ct="line">{text.line}</Body>
          </Stack>
        </Row>
      </Center>
    </Stage>
  ),
  motion: (m) => {
    m.tween("mark", { x: [MATCH.x, 0], scale: [MATCH.scale, 1] }, { at: "move", ease: "out", duration: "snap", allow: ["travel-too-far"] }); // litt-allow: travel-too-far (a match carrier, not an entrance)
    m.type("word", { at: "word", cps: 30 });
    m.enter("line", "wipeRight", { at: "line", duration: "snap", ease: "out" });
    m.camera({ scale: [1, 1.03] });
  },
});
