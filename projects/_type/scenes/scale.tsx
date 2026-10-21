import { scene, Stage, Safe, Headline, Title, Body, Caption, Label, El } from "continuity";

const Meta = ({ ct, children }: { ct: string; children: string }) => (
  <El ct={ct} as="p" class="font-mono text-small text-fg-subtle">{children}</El>
);

export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Safe>
        <div class="absolute left-[96px] top-[96px] grid grid-cols-[880px_1fr] items-baseline gap-x-[64px] gap-y-[32px]">
          <Headline ct="display" as="p">{text.display}</Headline>
          <Meta ct="displayMeta">{text.displayMeta}</Meta>
          <Title ct="title" as="p">{text.title}</Title>
          <Meta ct="titleMeta">{text.titleMeta}</Meta>
          <Body ct="body" class="text-fg">{text.body}</Body>
          <Meta ct="bodyMeta">{text.bodyMeta}</Meta>
          <Caption ct="small" class="text-fg">{text.small}</Caption>
          <Meta ct="smallMeta">{text.smallMeta}</Meta>
          <Label ct="label" class="text-fg">{text.label}</Label>
          <Meta ct="labelMeta">{text.labelMeta}</Meta>
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("display", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
    m.enter(["title", "body", "small", "label"], "rise", { at: "b1+0.3" });
    m.enter(["displayMeta", "titleMeta", "bodyMeta", "smallMeta", "labelMeta"], "fade", { at: "b1+0.6" });
    m.camera({ scale: [1, 1.02] });
  },
});
