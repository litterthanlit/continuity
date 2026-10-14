import type { MotionBuilder, StageBackground } from "continuity";
import { Eyebrow, Headline, Safe, Stage, Subhead } from "continuity";

/**
 * One frame per transition: number, name, a line on what it is for, and a big
 * accent block on alternating sides — hard edges for masks and blur to act on.
 */
export function Card({ text, bg, side }: { text: Record<string, string>; bg: StageBackground; side: "left" | "right" }) {
  const block = side === "left" ? "left-[6%]" : "right-[6%]";
  const copy = side === "left" ? "items-end text-right" : "items-start";
  return (
    <Stage bg={bg}>
      <div
        class={`absolute top-[18%] bottom-[18%] w-[30%] rounded-xl ${block}`}
        style="background:linear-gradient(140deg,var(--color-accent),var(--color-accent-2))"
      />
      <Safe>
        <div class={`absolute inset-0 flex flex-col justify-center gap-[24px] ${side === "left" ? "pl-[42%]" : "pr-[42%]"} ${copy}`}>
          <Eyebrow ct="num">{text.num}</Eyebrow>
          <Headline ct="title" size="display">{text.title}</Headline>
          <Subhead ct="sub">{text.sub}</Subhead>
        </div>
      </Safe>
    </Stage>
  );
}

/** The first scene introduces its copy; later ones arrive settled, so the transition is what you see. */
export function cardMotion(m: MotionBuilder, first: boolean) {
  if (first) {
    m.enter("num", "fadeBlur", { at: "b1" });
    m.enter("title", "maskUp", { at: "b1+0.1", split: "lines" });
    m.enter("sub", "rise", { at: "b1+0.3" });
  }
  m.camera({ scale: [1, 1.03] });
}
