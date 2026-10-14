import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { typeBaseOf } from "../src/build/typebase.js";
import { defineTheme, litt, littLight, monoDark, themes } from "../src/themes/index.js";
import { resolveKit, typeKits } from "../src/themes/kits.js";

const TOKENS = ["bg", "surface", "surface-2", "border", "fg", "muted", "subtle", "accent", "accent-2", "accent-fg", "positive", "warning", "danger"];

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("themes", () => {
  it("every theme defines all 13 colour tokens", () => {
    expect(Object.keys(themes).sort()).toEqual(["light-editorial", "litt", "litt-light", "mono-dark", "vivid-gradient"]);
    for (const t of Object.values(themes)) expect(Object.keys(t.colors).sort(), t.name).toEqual([...TOKENS].sort());
  });

  it("the theme's registry key is its name", () => {
    for (const [key, t] of Object.entries(themes)) expect(t.name).toBe(key);
  });

  it.each([litt, littLight])("$name body, muted and subtle text pass WCAG AA (4.5:1) on bg", (t) => {
    for (const token of ["fg", "muted", "subtle"] as const) {
      expect(contrast(t.colors[token], t.colors.bg), `${t.name} ${token}/bg`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([litt, littLight])("$name accent-fg is readable on accent (4.5:1)", (t) => {
    expect(contrast(t.colors["accent-fg"], t.colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("the litt themes are the litt look: lit backdrop, control radius, glow-and-ring depth", () => {
    for (const t of [litt, littLight]) {
      expect(t.background).toBe("lit");
      expect(t.radius.control).toBe(8);
      expect(t.shadows?.glow).toContain("0 0 0 2px");
      expect(t.suggestedType).toBe("litt");
    }
    expect(litt.mode).toBe("dark");
    expect(littLight.mode).toBe("light");
  });

  it("the legacy themes set no knobs, so they keep the legacy look", () => {
    for (const t of [monoDark, themes["light-editorial"], themes["vivid-gradient"]]) {
      expect(t.radius.control, t.name).toBeUndefined();
      expect(t.shadows, t.name).toBeUndefined();
    }
  });

  it("defineTheme merges shadows like colours and radius", () => {
    const t = defineTheme("litt", { shadows: { glow: "0 0 0 1px red" }, radius: { ...litt.radius, control: 4 } });
    expect(t.shadows).toEqual({ glow: "0 0 0 1px red", float: litt.shadows!.float });
    expect(t.radius.control).toBe(4);
    expect(t.radius.lg).toBe(16);
    expect(defineTheme("mono-dark").shadows).toBeUndefined();
  });

  it("litt and litt-light resolve to the litt kit; the kit pairs with both", () => {
    expect(resolveKit(litt).name).toBe("litt");
    expect(resolveKit(littLight).name).toBe("litt");
    expect(typeKits.litt.pairs).toEqual(["litt", "litt-light"]);
  });
});

describe("the litt kit is one weight", () => {
  it("no role draws above 400", () => {
    for (const [role, style] of Object.entries(typeKits.litt.roles)) expect(style.weight, role).toBeLessThanOrEqual(400);
    expect(typeKits.litt.oneWeight).toBe(true);
  });

  it("figures go to the mono role (Host Grotesk has no tabular figures)", () => {
    expect(typeKits.litt.figures).toBe("mono");
    expect(typeKits.litt.roles.display.family.family).toBe("Host Grotesk");
  });

  const el = (cls: string) => {
    const { document } = parseHTML(`<div class="${cls}">x</div>`);
    return document.querySelector("div") as unknown as Parameters<typeof typeBaseOf>[0];
  };

  it("lint resolves named weight classes to the flattened weight under the video's kit", () => {
    for (const named of ["font-medium", "font-semibold", "font-bold", "font-extrabold", "font-black"]) {
      expect(typeBaseOf(el(`font-sans ${named}`), typeKits.litt).values.wght, named).toBe(400);
    }
    expect(typeBaseOf(el("font-light"), typeKits.litt).values.wght).toBe(300);
    // an arbitrary value is not a named weight; the theme variables do not flatten it
    expect(typeBaseOf(el("font-[700]"), typeKits.litt).values.wght).toBe(700);
  });

  it("other kits keep Tailwind's weights, and a scene kit does not flatten under a normal video", () => {
    expect(typeBaseOf(el("font-semibold"), typeKits.swiss).values.wght).toBe(600);
    expect(typeBaseOf(el("font-bold"), typeKits.litt, typeKits.swiss).values.wght).toBe(700);
    // ...but a scene kit under a one-weight video does (the theme variables are global)
    expect(typeBaseOf(el("font-bold"), typeKits.swiss, typeKits.litt).values.wght).toBe(400);
  });
});
