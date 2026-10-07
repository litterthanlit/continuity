import { scene, Stage, Window, CodeBlock, Terminal, Input, Toggle, Progress, Phone, Kbd } from "continuity";

const CODE = `import { scene, Stage, Headline } from "continuity";

export default scene({
  view: ({ text }) => <Headline ct="title">{text.t}</Headline>,
  motion: (m) => {
    m.enter("title", "maskUp", { split: "lines" });
  },
});`;

export default scene({
  view: () => (
    <Stage bg="spotlight">
      <div class="absolute left-[110px] top-[120px] flex flex-col gap-[32px]">
        <Window ct="editor" title="scenes/hook.tsx" width={1080} height={560}>
          <CodeBlock ct="code" code={CODE} class="p-[28px]" size={26} />
        </Window>
        <Window ct="term" title="zsh" width={1080} height={300}>
          <Terminal ct="sh" class="p-[26px]" lines={["$ pnpm ct check example-type", "◆ browser audit…", "✔ check: 0 errors, 0 warnings"]} />
        </Window>
      </div>
      <div class="absolute right-[150px] top-[110px]">
        <Phone ct="phone" width={440}>
          <div class="flex h-full flex-col gap-[26px] bg-surface px-[30px] pt-[110px]">
            <Input ct="search" value="motion design" width={320} />
            <div class="flex items-center justify-between font-sans text-[28px] text-fg">
              Auto-check <Toggle ct="tg" />
            </div>
            <Progress ct="pr" value={0.72} width={320} />
            <div class="flex gap-[12px]">
              <Kbd ct="k1">⌘</Kbd>
              <Kbd ct="k2">K</Kbd>
            </div>
          </div>
        </Phone>
      </div>
    </Stage>
  ),
  motion: (m) => {
    m.enter("editor", "rise", { at: "b1", distance: 60 });
    m.enter(["code-l0", "code-l2", "code-l3", "code-l4", "code-l5", "code-l6", "code-l7"], "fade", { at: "b1+0.3", stagger: 0.06 });
    m.enter("term", "rise", { at: "b2", distance: 40 });
    m.type("sh-l0", { at: "b2+0.3" });
    m.enter(["sh-l1", "sh-l2"], "fade", { at: "b3+0.5", stagger: 0.35 });
    m.enter("phone", "slideLeft", { at: "b1+0.2", distance: 120, duration: "hero" });
    m.type("search-text", { at: "b2" });
    m.blink("search-caret", { at: "b1", until: "end" });
    m.tween("tg-knob", { x: [0, 36] }, { at: "b3", duration: "base", ease: "snappy" });
    m.tween("tg-on", { opacity: [0, 1] }, { at: "b3", duration: "base", ease: "standard" });
    m.tween("pr-fill", { scaleX: [0, 1] }, { at: "b2+0.2", duration: "linger", ease: "inOut", kind: "enter" });
    m.emphasize(["k1", "k2"], "nudge", { at: "b3+0.6", stagger: 0.08 });
  },
});
