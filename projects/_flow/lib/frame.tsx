import type { ComponentChildren } from "preact";
import type { StageBackground } from "continuity";
import { BarChart, Body, Card, Headline, Label, Safe, Stack, Stage } from "continuity";

/**
 * A full-frame chapter: copy on the left, a raised chart surface on the right. `quiet` draws a
 * picture of it (inside a screen): no ct ids, a plain canvas instead of the stage's light.
 */
export function Chapter({ text, bg, data, quiet }: { text: Record<string, string>; bg: StageBackground; data: number[]; quiet?: boolean }) {
  const ct = (id: string) => (quiet ? undefined : id);
  const Frame = ({ children }: { children: ComponentChildren }) =>
    quiet ? <div class="absolute inset-0 bg-canvas">{children}</div> : <Stage bg={bg}>{children}</Stage>;
  return (
    <Frame>
      <Card ct={ct("bars")} class="absolute top-[192px] right-[96px] bottom-[192px] flex w-[880px] items-end">
        <BarChart data={data} width={784} height={440} />
      </Card>
      <Safe>
        <Stack gap={32} class="absolute top-1/2 left-0 w-[720px] -translate-y-1/2">
          <Stack gap={8}>
            <Label ct={ct("label")}>{text.label}</Label>
            <Headline ct={ct("title")}>{text.title}</Headline>
          </Stack>
          <Body ct={ct("sub")}>{text.sub}</Body>
        </Stack>
      </Safe>
    </Frame>
  );
}
