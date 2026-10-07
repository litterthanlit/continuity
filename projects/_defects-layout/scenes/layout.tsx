import { scene, Stage, Headline, Body } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid" grain={false}>
      <div class="absolute left-[200px] top-[160px] w-[320px] overflow-hidden whitespace-nowrap">
        <Body ct="clipped" class="text-fg">{text.clipped}</Body>
      </div>
      <p data-ct="layout.tiny" class="absolute left-[200px] top-[320px] text-[16px] text-fg">{text.tiny}</p>
      <Headline ct="edge" size="h3" class="absolute left-[8px] top-[480px]">{text.edge}</Headline>
      <Body ct="dim" class="absolute left-[200px] top-[680px] text-[#1c1c1f]">{text.dim}</Body>
      <Headline ct="x1" size="h2" class="absolute left-[600px] top-[820px]">{text.x1}</Headline>
      <Headline ct="x2" size="h2" class="absolute left-[600px] top-[820px]">{text.x2}</Headline>
    </Stage>
  ),
  motion: (m) => {
    m.enter("x1", "slideLeft", { at: 0.2, distance: 400 });
    m.exit("x1", "fadeOut", { at: 1.2 });
    m.enter("x2", "slideRight", { at: 0.6, distance: 400 }); // collides with x1 mid-motion
  },
});
