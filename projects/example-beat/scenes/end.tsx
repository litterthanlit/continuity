import { scene, Stage, Morph, Headline, Body, Label, placeShape, shapeBounds, textShape } from "continuity";
import { MARK } from "../lib/mark.js";

/** The lockup's box, centred: the mark (176) + 48 + the wordmark. */
const W = 760;
const H = 220;
const MARK_SIZE = 176;
const WORD_X = MARK_SIZE + 48;

// The wordmark's outline whips up whole with the cut (seen from the cut's first frame; a wipe spent
// its first frames on the empty mark slot) and holds; on the kick on beat 2 it pours into the mark at
// the lockup's left (text to shape: the C becomes the C, every other letter shrinks away where it
// stands), fastest on the kick and settling over the drift. The real wordmark types back on
// where the outline was once the mark has cleared it, the line wipes on the and, and the repo types on the next bar's kick.
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
        <Morph ct="mark" shapes={SHAPES} samples={1200} collapse="in-place" viewBox={`0 0 ${W} ${H}`} width={W} height={H} class="absolute left-0 top-0" />
        <div class="absolute flex flex-col gap-[16px]" style={`left:${WORD_X}px;top:0;height:${H}px;justify-content:center`}>
          <Headline ct="word" class="whitespace-nowrap">{text.word}</Headline>
          <Body ct="line" class="whitespace-nowrap">{text.line}</Body>
        </div>
      </div>
      <Label ct="cta" class="absolute bottom-[192px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono">
        {text.cta}
      </Label>
    </Stage>
  ),
  motion: (m) => {
    m.enter("mark", "whip", { at: 0, dir: "up", duration: "slow" });
    m.tween("mark", { morph: [0, 1] }, { at: "morph", ease: "out", duration: "drift", kind: "emphasis" });
    m.type("word", { at: "word", cps: 30 });
    m.enter("line", "wipeRight", { at: "line", duration: "snap", ease: "out" });
    m.type("cta", { at: "cta", cps: 30 });
    // litt-allow: ease-linear (a 3% push over 3.9s: inOut's tail falls under a pixel a frame and stair-steps)
    m.camera({ scale: [1, 1.03] }, { ease: "linear", allow: ["ease-linear"] });
  },
});
