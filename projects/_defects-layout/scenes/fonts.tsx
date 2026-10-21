import { scene, Stage, Counter, Caption } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid" grain={false}>
      {/* Geist has no width axis: 75% has no face (font-face-missing) */}
      <p data-ct="fonts.bold" class="absolute left-[200px] top-[200px] font-sans font-stretch-75% text-title text-fg">{text.bold}</p>
      <Counter ct="n" class="absolute left-[200px] top-[400px] font-sans text-display text-fg" />
      <Caption ct="label" class="absolute left-[200px] top-[560px]">{text.label}</Caption>
    </Stage>
  ),
  motion: (m) => {
    m.counter("n", { to: 1280, at: 0.3, duration: "linger" });
  },
});
