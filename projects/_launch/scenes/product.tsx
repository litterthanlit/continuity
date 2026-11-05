import { Browser, Button, Center, List, scene, Stage, Title } from "continuity";

// The reveal that explains scale: the scene opens on the product's own screen, full frame, and
// the camera flies back to show it is a page in a browser. Then the keywords load and the camera
// pushes in on the action. The browser sits in the frame's centre, as m.pullBack needs.
const ROWS = [
  { title: "seo for founders", tag: "Rank 1", tone: "success" as const, meta: "2,400/mo" },
  { title: "saas seo tools", tag: "Rank 3", meta: "1,900/mo" },
  { title: "ai search ranking", tag: "Rank 4", meta: "880/mo" },
  { title: "technical seo audit", tag: "Rank 7", meta: "720/mo" },
];

export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Center>
        <Browser ct="browser" url="harbor.dev/keywords">
          <div class="flex h-full flex-col gap-[32px] p-[56px] text-left">
            <div class="flex items-center justify-between">
              <Title ct="title">{text.title}</Title>
              <Button ct="cta" variant="primary">
                {text.cta}
              </Button>
            </div>
            <List ct="rows" rows={ROWS} />
          </div>
        </Browser>
      </Center>
    </Stage>
  ),
  motion: (m) => {
    m.pullBack("browser", { at: "b1" });
    m.enter(["rows-r0", "rows-r1", "rows-r2", "rows-r3"], "rise", { at: "b2", duration: "snap", ease: "steep", stagger: 0.033 });
    m.camera({ scale: [1, 1.25], x: [0, 0], y: [0, 130] }, { at: "b3", duration: "slow", ease: "steep" });
    m.emphasize("cta", "press", { at: "b4" });
  },
});
