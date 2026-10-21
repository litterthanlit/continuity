import type { MotionBuilder, StageBackground } from "continuity";
import { BarChart, Body, Card as Surface, Headline, Label, Safe, Stack, Stage } from "continuity";

/**
 * One frame per transition: a label, the name, a line on what it is for, and a
 * flat raised surface on alternating sides (with a quiet chart in it), so mask
 * edges and motion blur have hard edges to act on.
 */
export function Card({ text, bg, side }: { text: Record<string, string>; bg: StageBackground; side: "left" | "right" }) {
  const block = side === "left" ? "left-[96px]" : "right-[96px]";
  const copy = side === "left" ? "left-[928px]" : "left-[96px]";
  return (
    <Stage bg={bg}>
      <Surface ct="block" class={`absolute top-[192px] bottom-[192px] flex w-[704px] items-end ${block}`}>
        <BarChart ct="bars" data={[30, 46, 38, 62, 55, 80, 96]} width={608} height={400} />
      </Surface>
      <Safe>
        <Stack gap={32} class={`absolute top-1/2 w-[800px] -translate-y-1/2 ${copy}`}>
          <Stack gap={8}>
            <Label ct="num">{text.num}</Label>
            <Headline ct="title">{text.title}</Headline>
          </Stack>
          <Body ct="sub">{text.sub}</Body>
        </Stack>
      </Safe>
    </Stage>
  );
}

/** The first scene introduces its copy; later ones arrive settled, so the transition is what you see. */
export function cardMotion(m: MotionBuilder, first: boolean) {
  if (first) {
    m.enter("num", "fade", { at: "b1" });
    m.enter("title", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.enter("sub", "rise", { at: "after:title-0.2" });
  }
  m.camera({ scale: [1, 1.02] });
}
