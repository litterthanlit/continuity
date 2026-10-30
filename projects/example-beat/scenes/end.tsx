import { scene, Stage, Morph, Headline, Body, placeShape, shapeBounds, textShape } from "continuity";
import { MARK } from "../lib/mark.js";

/** The lockup's box, centred: the mark (176) + 48 + the wordmark. */
const W = 760;
const H = 220;
const MARK_SIZE = 176;
const WORD_X = MARK_SIZE + 48;

// The wordmark's outline wipes on where the wordmark will sit; on beat 1 it pours into the mark
// at the lockup's left (text → shape: the C becomes the C, every other letter flows into the
// mark's nearest edge), fastest on the beat and settling after; the real wordmark types on where
// the outline was, and the line lands on the next bar.
const word = textShape("Continuity", { size: 112, weight: 500 });
const wb = shapeBounds(word);
const SHAPES = [
  placeShape(word, { x: WORD_X - wb.x, y: (H - wb.height) / 2 - wb.y }),
  placeShape(MARK, { scale: MARK_SIZE / 240, y: (H - MARK_SIZE) / 2 }),
];

export default scene({
  view: ({ text, width, height }) => (
    <Stage bg="lit">
      <div class="absolute" style={`left:${(width - W) / 2}px;top:${(height - H) / 2}px;width:${W}px;height:${H}px`}>
        <Morph ct="mark" shapes={SHAPES} samples={600} collapse="into" viewBox={`0 0 ${W} ${H}`} width={W} height={H} class="absolute left-0 top-0" />
        <div class="absolute flex flex-col gap-[16px]" style={`left:${WORD_X}px;top:0;height:${H}px;justify-content:center`}>
          <Headline ct="word" class="whitespace-nowrap">{text.word}</Headline>
          <Body ct="line" class="whitespace-nowrap">{text.line}</Body>
        </div>
      </div>
    </Stage>
  ),
  motion: (m) => {
    m.enter("mark", "wipeRight", { at: 0, duration: "snap", ease: "steep" });
    m.tween("mark", { morph: [0, 1] }, { at: "morph", ease: "out", duration: "slow", kind: "emphasis" });
    m.type("word", { at: "word", cps: 30 });
    m.enter("line", "wipeRight", { at: "line", duration: "snap", ease: "steep" });
    m.camera({ scale: [1, 1.03] });
  },
});
