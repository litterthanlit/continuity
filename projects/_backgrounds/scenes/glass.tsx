import { scene, Card, Label, Safe, Stage, Title } from "continuity";

// Three frosted panels floating over aurora: the field blurs through the glass, the type sits on its fill.
export default scene({
  view: ({ text }) => (
    <Stage bg="gradient" gradient="aurora">
      <Safe>
        <Label ct="label" class="absolute top-[64px] left-0 text-fg">
          {text.label}
        </Label>
        <div data-ct="panels" class="absolute bottom-[96px] left-0 flex gap-[48px]">
          {[1, 2, 3].map((k) => (
            <Card ct={`p${k}`} glass class="flex h-[420px] w-[544px] items-end">
              <Title ct={`t${k}`}>{text[`t${k}`]}</Title>
            </Card>
          ))}
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter(["p1", "p2", "p3"], "rise", { at: "b1+0.1", stagger: "list" });
  },
});
