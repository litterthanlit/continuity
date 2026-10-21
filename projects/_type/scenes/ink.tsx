import { scene, Stage, Safe, Headline, El } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <Headline ct="line" class="absolute left-[96px] top-1/2 -translate-y-1/2 whitespace-nowrap">
          <El ct="pre" as="span">{text.pre}</El>
          <El ct="key" as="span">{text.key}</El>
          <El ct="post" as="span">{text.post}</El>
        </Headline>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("line", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    // The rest of the line steps back to the grey; the word that matters keeps fg.
    m.emphasize(["pre", "post"], "dim", { at: "b2", stagger: 0 });
    m.camera({ scale: [1, 1.03] });
  },
});
