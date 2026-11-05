import { Center, Headline, Input, Label, scene, Stage } from "continuity";

// The match cut lands "Harbor" in the brand label; then the one thing to do: enter your site. The
// camera goes in on the typed domain until it is bigger than the frame (a macro, measured by the
// runtime wherever the field sits), holds on the caret, and pulls back out.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Center class="gap-[40px]">
        <Label ct="brand">{text.brand}</Label>
        <Headline ct="headline" size="title">
          {text.headline}
        </Headline>
        <Input ct="site" value={text.site} width={760} focus />
      </Center>
    </Stage>
  ),
  motion: (m) => {
    m.enter("headline", "wipeRight", { at: "b1", duration: "snap", ease: "steep" });
    m.enter("site", "rise", { at: "b1+0.1", duration: "snap", ease: "steep" });
    m.type("site-text", { at: "b2", cps: 18 });
    m.zoomTo("site-text", { at: "b3", fill: 1.4 });
    m.camera({ scale: [null, 1], x: [null, 0], y: [null, 0] }, { at: "b4", duration: "linger", ease: "inOut" });
  },
});
