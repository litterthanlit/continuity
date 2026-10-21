import { describe, expect, it } from "vitest";
import { cx } from "../src/kit/core.js";

describe("cx class merge", () => {
  it("later classes win within a group", () => {
    expect(cx("font-sans text-label text-fg-subtle", "text-fg")).toBe("font-sans text-label text-fg");
    expect(cx("text-display text-fg", "text-[140px]")).toBe("text-fg text-[140px]");
    expect(cx("font-sans font-title", "font-normal")).toBe("font-sans font-normal");
  });
  it("keeps unrelated and variant-scoped classes", () => {
    expect(cx("text-center text-fg", "text-balance")).toBe("text-center text-fg text-balance");
    expect(cx("text-fg md:text-fg-muted", "text-fg-subtle")).toBe("md:text-fg-muted text-fg-subtle");
    expect(cx("a", false, undefined, "b")).toBe("a b");
  });
});

describe("kit components set litt's type by role", async () => {
  const { h } = await import("preact");
  const { renderToString } = await import("preact-render-to-string");
  const { withScene } = await import("../src/kit/context.js");
  const { Body, Caption, Headline, Label, Title } = await import("../src/kit/type.js");
  const { Button, Sidebar, Stat, Tag, Toggle } = await import("../src/kit/ui.js");
  const { littDark } = await import("../src/themes/index.js");
  const { littKit } = await import("../src/themes/kits.js");
  const ctx = { id: "s", text: {}, aspect: "16:9", width: 1920, height: 1080, portrait: false, landscape: true, square: false, theme: littDark, typeKit: littKit, beats: {}, duration: 3, index: 0, total: 1 } as const;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = (node: import("preact").VNode<any>) => withScene(ctx, () => renderToString(node));

  it("weight, ink and size by role (P9): display 500 fg, title 500, text 400 in the grey, labels 600", () => {
    expect(render(h(Headline, { ct: "t" }, "Hi"))).toContain('class="text-display text-balance font-display text-fg"');
    expect(render(h(Title, { ct: "t" }, "Hi"))).toContain("text-title text-balance font-sans font-title text-fg");
    expect(render(h(Body, { ct: "b" }, "Hi"))).toContain("text-body font-sans text-fg-muted");
    expect(render(h(Caption, { ct: "c" }, "Hi"))).toContain("text-small font-sans text-fg-subtle");
    expect(render(h(Label, { ct: "l" }, "Hi"))).toContain("text-label font-sans font-label text-fg-subtle");
    expect(render(h(Label, { ct: "l" }, "Hi"))).not.toMatch(/uppercase|font-mono|tracking/);
  });

  it("an explicit class still overrides the kit", () => {
    expect(render(h(Headline, { ct: "t", class: "font-normal" }, "Hi"))).toContain("font-display text-fg font-normal");
  });

  it("the UI kit keeps colour off chrome and wears litt's shapes", () => {
    const primary = render(h(Button, { ct: "b", variant: "primary" }, "Go"));
    expect(primary).toContain("rounded-control");
    expect(primary).toContain("bg-accent text-accent-fg shadow-glow");
    expect(render(h(Button, { ct: "b" }, "Go"))).toContain("bg-surface-1 text-fg shadow-control");
    const tag = render(h(Tag, { ct: "t", tone: "success" }, "Live"));
    expect(tag).toContain("text-label font-label");
    expect(tag).toContain("text-success");
    expect(render(h(Tag, { ct: "t", hue: "teal" }, "Finance"))).toContain("var(--color-data-teal-tint)");
    expect(render(h(Toggle, { ct: "s", on: true }))).toContain("bg-fg");
    expect(render(h(Toggle, { ct: "s", on: true }))).not.toContain("bg-accent");
    // P12: the current item is the raised segment
    expect(render(h(Sidebar, { ct: "n", items: ["Inbox", "Issues"], active: 1 }))).toMatch(/data-ct="s\.n-i1" class="[^"]*bg-surface-2 text-fg shadow-raised/);
    expect(render(h(Stat, { ct: "n", value: 1200, label: "Deploys" }))).toContain("font-sans font-title tabular-nums text-fg");
  });
});
