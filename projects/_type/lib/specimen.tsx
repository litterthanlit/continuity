import type { MotionBuilder } from "continuity";
import { Body, Emph, Eyebrow, Headline, Safe, Serif, Stage, Stat } from "continuity";

/**
 * One specimen layout for every kit: eyebrow, a two-line headline with one
 * serif accent word, a body line, and a stat — the same grid in every scene so
 * cutting between kits compares only the type.
 */
export function Specimen({ text, value, decimals = 0 }: { text: Record<string, string>; value: number; decimals?: number }) {
  return (
    <Stage bg="grid">
      <Safe>
        <div class="absolute inset-0 flex flex-col justify-center gap-[40px] pr-[22%]">
          <Eyebrow ct="eyebrow">{text.eyebrow}</Eyebrow>
          <Headline ct="title" size="h1">
            <Emph text={text.title} word={text.accent}>{(w) => <Serif class="text-accent">{w}</Serif>}</Emph>
          </Headline>
          <Body ct="body">{text.body}</Body>
        </div>
        <div class="absolute right-0 bottom-0">
          <Stat ct="stat" value={value} decimals={decimals} label={text.stat} />
        </div>
      </Safe>
    </Stage>
  );
}

export function specimenMotion(m: MotionBuilder, to: number, decimals = 0) {
  m.enter("eyebrow", "fadeBlur", { at: "b1" });
  m.enter("title", "maskUp", { at: "b1+0.15", split: "lines" });
  m.enter("body", "rise", { at: "b1+0.6" });
  m.enter("stat-label", "fade", { at: "b1+0.8" });
  m.counter("stat", { from: 0, to, decimals, at: "b1+0.8", duration: "hero" });
  m.camera({ scale: [1, 1.03] });
}
