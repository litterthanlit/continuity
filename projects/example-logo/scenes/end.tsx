import { scene, Stage, Center, Row, Stack, Headline, Body, Shape } from "continuity";
import { MARK } from "../lib/mark.js";

// The lockup, flat and centred — litt's one centred statement, the logo film's last word. The
// mark lands with the kick, the wordmark types on the "and", the line wipes on the next beat;
// the camera's push carries the hold.
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
    m.enter("mark", "settle", { at: "b1", ease: "pop" });
    m.type("word", { at: "word", cps: 30 });
    m.enter("line", "wipeRight", { at: "line", duration: "snap", ease: "steep" });
    m.camera({ scale: [1, 1.03] });
  },
});
