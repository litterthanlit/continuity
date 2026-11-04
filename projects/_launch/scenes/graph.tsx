import { DotGrid, Headline, Label, scene, Safe, Stage } from "continuity";

// The before and after in one grid: the weeks fill in on a wave, then every square turns into a
// dot sized by what shipped that day. Teal names the one series; colour carries the data.
const WEEKS = 26;
const DAYS = 7;
// Deterministic data: a rising trend, broken up so it reads as real days (no Math.random).
const VALUES = Array.from({ length: WEEKS * DAYS }, (_, i) => {
  const week = Math.floor(i / DAYS);
  const day = i % DAYS;
  const jitter = ((week * 31 + day * 17) % 11) / 10;
  const weekend = day === 0 || day === 6 ? 0.5 : 1;
  const v = (0.15 + 0.7 * (week / (WEEKS - 1))) * weekend * (0.6 + 0.4 * jitter);
  return week < 8 && jitter < 0.3 ? 0 : Math.round(v * 100) / 100;
});

export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Safe class="flex flex-col justify-center gap-[64px]">
        <div class="flex flex-col gap-[16px]">
          <Label ct="label">{text.label}</Label>
          <Headline ct="headline">{text.headline}</Headline>
        </div>
        <DotGrid ct="days" values={VALUES} rows={DAYS} cell={44} gap={12} hue="teal" />
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "wipeRight", { at: 0.1, duration: "snap", ease: "steep" });
    m.enter("headline", "wipeRight", { at: 0.2, duration: "snap", ease: "steep" });
    m.grid("days", "fill", { at: "b1", span: 0.8, ease: "steep", duration: "snap" });
    m.grid("days", "dots", { at: "b2", span: 0.8, ease: "steep", duration: "snap" });
  },
});
