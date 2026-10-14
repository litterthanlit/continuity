import { describe, expect, it } from "vitest";
import { cx } from "../src/kit/core.js";

describe("cx class merge", () => {
  it("later classes win within a group", () => {
    expect(cx("font-mono text-micro text-subtle", "text-accent")).toBe("font-mono text-micro text-accent");
    expect(cx("text-h1 text-fg", "text-[140px]")).toBe("text-fg text-[140px]");
    expect(cx("tracking-[0.18em] uppercase", "tracking-tight normal-case")).toBe("tracking-tight normal-case");
  });
  it("keeps unrelated and variant-scoped classes", () => {
    expect(cx("text-center text-fg", "text-balance")).toBe("text-center text-fg text-balance");
    expect(cx("text-fg md:text-muted", "text-accent")).toBe("md:text-muted text-accent");
    expect(cx("a", false, undefined, "b")).toBe("a b");
  });
});

describe("kit components follow the scene's type kit", async () => {
  const { h } = await import("preact");
  const { renderToString } = await import("preact-render-to-string");
  const { withScene } = await import("../src/kit/context.js");
  const { Eyebrow, Headline, Serif } = await import("../src/kit/type.js");
  const { Stat } = await import("../src/kit/ui.js");
  const { monoDark } = await import("../src/themes/index.js");
  const { classicKit, typeKits } = await import("../src/themes/kits.js");
  const ctx = (typeKit: import("../src/themes/kits.js").TypeKit) =>
    ({ id: "s", text: {}, aspect: "16:9", width: 1920, height: 1080, portrait: false, landscape: true, square: false, theme: monoDark, typeKit, beats: {}, duration: 3, index: 0, total: 1 }) as const;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = (kit: import("../src/themes/kits.js").TypeKit, node: import("preact").VNode<any>) => withScene(ctx(kit), () => renderToString(node));

  it("classic emits the v1 classes exactly", () => {
    const k = classicKit(monoDark);
    expect(render(k, h(Headline, { ct: "t" }, "Hi"))).toContain('class="text-display text-balance font-display font-semibold text-fg"');
    expect(render(k, h(Eyebrow, { ct: "e" }, "Hi"))).toContain("font-mono uppercase tracking-[0.18em] text-subtle");
    expect(render(k, h(Serif, { children: "Hi" }))).toContain("font-serif italic font-normal tracking-normal");
    expect(render(k, h(Stat, { ct: "n", value: 1, label: "x" }))).toContain("font-display text-h1 font-semibold tabular-nums text-fg");
  });

  it("v2 kits leave weight, case and label tracking to the kit's role rules", () => {
    const k = typeKits.wonk;
    const headline = render(k, h(Headline, { ct: "t" }, "Hi"));
    expect(headline).toContain("font-display text-fg");
    expect(headline).not.toContain("font-semibold");
    expect(render(k, h(Eyebrow, { ct: "e" }, "Hi"))).toContain("font-mono ct-label text-subtle");
    expect(render(k, h(Serif, { children: "Hi" }))).toContain("font-serif italic ct-accent");
    expect(render(k, h(Stat, { ct: "n", value: 1, label: "x" }))).toContain("font-mono text-h1 tabular-nums");
  });

  it("an explicit class still overrides the kit", () => {
    expect(render(typeKits.swiss, h(Headline, { ct: "t", class: "font-bold" }, "Hi"))).toContain("font-display text-fg font-bold");
    expect(cx("font-stretch-75%", "font-stretch-125%")).toBe("font-stretch-125%");
  });
});
