import { scene, Stage, Counter, Caption } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid" grain={false}>
      {/* DM Mono ships 300–500 only: 700 has no face (font-face-missing) */}
      <p data-ct="fonts.bold" class="absolute left-[200px] top-[200px] font-mono font-bold text-h3 text-fg">{text.bold}</p>
      {/* Hanken Grotesk has no tabular figures (counter-proportional) */}
      <Counter ct="n" class="absolute left-[200px] top-[400px] font-sans text-h1 text-fg" />
      <Caption ct="label" class="absolute left-[200px] top-[560px]">{text.label}</Caption>
    </Stage>
  ),
  motion: (m) => {
    m.counter("n", { to: 1280, at: 0.3, duration: "linger" });
  },
});
