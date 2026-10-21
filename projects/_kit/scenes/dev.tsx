import { scene, Stage, Window, CodeBlock, Terminal, Input, Toggle, Meter, Phone, Kbd, Button, Avatar, Row } from "continuity";

const CODE = `import { scene, Stage, Headline } from "continuity";

export default scene({
  view: ({ text }) => <Headline ct="title">{text.t}</Headline>,
  motion: (m) => {
    m.enter("title", "maskUp", { split: "lines" });
  },
});`;

export default scene({
  view: () => (
    <Stage>
      <div class="absolute left-[112px] top-[112px] flex flex-col gap-[32px]">
        <Window ct="editor" title="scenes/hook.tsx" width={1088} height={560}>
          <CodeBlock ct="code" code={CODE} class="p-[32px]" size={26} />
        </Window>
        <Window ct="term" title="zsh" width={1088} height={304}>
          <Terminal ct="sh" class="p-[32px]" lines={["$ pnpm ct check example-type", "◆ browser audit…", "✔ check: 0 errors, 0 warnings"]} />
        </Window>
      </div>
      <div class="absolute right-[144px] top-[112px]">
        <Phone ct="phone" width={448}>
          <div class="flex h-full flex-col gap-[32px] bg-surface-1 px-[32px] pt-[112px]">
            <Input ct="search" value="motion design" width={336} focus />
            <div class="flex items-center justify-between font-sans text-[28px] text-fg">
              Auto-check <Toggle ct="tg" />
            </div>
            <Meter ct="pr" value={0.72} width={336} />
            <Row gap={8}>
              <Kbd ct="k1">⌘</Kbd>
              <Kbd ct="k2">K</Kbd>
            </Row>
            <Row gap={8}>
              <Avatar ct="a1" initials="NG" />
              <Avatar ct="a2" initials="LT" />
              <Avatar ct="a3" initials="CT" />
            </Row>
            <Button ct="go" variant="primary">Render</Button>
          </div>
        </Phone>
      </div>
    </Stage>
  ),
  motion: (m) => {
    m.enter("editor", "rise", { at: "b1" });
    m.enter(["code-l0", "code-l2", "code-l3", "code-l4", "code-l5", "code-l6", "code-l7"], "fade", { at: "b1+0.3", stagger: "list" });
    m.enter("term", "rise", { at: "b2" });
    m.type("sh-l0", { at: "b2+0.3" });
    m.enter(["sh-l1", "sh-l2"], "fade", { at: "b3+0.5", stagger: 0.3 });
    m.enter("phone", "settle", { at: "b1+0.2" });
    m.type("search-text", { at: "b2" });
    m.blink("search-caret", { at: "b1", until: "end" });
    m.tween("tg-knob", { x: [0, 32] }, { at: "b3", duration: "instant", ease: "out" });
    m.tween(["tg-on", "tg-knob-on"], { opacity: [0, 1] }, { at: "b3", duration: "instant", ease: "out", stagger: 0 });
    m.tween("pr-fill", { scaleX: [0, 1] }, { at: "b2+0.2", duration: "linger", ease: "inOut", kind: "enter" });
    m.emphasize("go", "press", { at: "b3+0.6" });
  },
});
