import { describe, expect, it } from "vitest";
import { buildFamilies, compileCss, fontFaceCss, kitCss } from "../src/build/css.js";
import { PKG_ROOT } from "../src/paths.js";
import { fonts, hasTabularFigures } from "../src/themes/fonts.js";
import { DATA_HUES, littDark, littLight, themes } from "../src/themes/index.js";
import { defineKit, KIT_NAMES, kitScale, littKit, resolveKit, typeKits, WEIGHTS } from "../src/themes/kits.js";

describe("the litt kit", () => {
  it("is Geist and Geist Mono, in three weights by role (P9)", () => {
    expect(KIT_NAMES).toEqual(["litt"]);
    expect(Object.keys(fonts).sort()).toEqual(["geist", "geistMono"]);
    expect(littKit.roles.display).toMatchObject({ family: fonts.geist, weight: 500 });
    expect(littKit.roles.sans).toMatchObject({ family: fonts.geist, weight: 400 });
    expect(littKit.roles.mono).toMatchObject({ family: fonts.geistMono, weight: 400 });
    expect(Object.values(WEIGHTS)).toEqual([400, 500, 600]);
    expect(hasTabularFigures(littKit.roles[littKit.figures].family)).toBe(true);
  });

  it("one display step; everything else stays near litt's 1.3 ratio, on whole pixels, above the legibility floors", () => {
    const land = kitScale(littKit);
    const port = kitScale(littKit, true);
    expect(land.title[0] / land.body[0]).toBeCloseTo(1.33, 2);
    for (const [, [size, lh]] of Object.entries(land)) {
      expect(size).toBeGreaterThanOrEqual(26);
      expect(Number.isInteger(lh)).toBe(true);
    }
    for (const [, [size]] of Object.entries(port)) expect(size).toBeGreaterThanOrEqual(34);
    // tracking tightens as size grows
    const track = (["label", "small", "body", "title", "display"] as const).map((k) => parseFloat(land[k][2]));
    expect([...track].sort((a, b) => b - a)).toEqual(track);
  });

  it("resolves storyboard type > theme type > litt", () => {
    expect(resolveKit(littDark).name).toBe("litt");
    const brand = defineKit("litt", { name: "brand", roles: { display: { weight: 600 } } });
    expect(resolveKit({ ...littDark, type: brand }).name).toBe("brand");
    expect(() => resolveKit(littDark, "swiss")).toThrow(/Unknown type kit/);
  });

  it("defineKit merges per role", () => {
    const k = defineKit("litt", { name: "brand", roles: { display: { weight: 600 } } });
    expect(k.roles.display.weight).toBe(600);
    expect(k.roles.display.family.family).toBe("Geist");
    expect(k.roles.sans).toBe(typeKits.litt.roles.sans);
  });
});

describe("the litt themes", () => {
  it("are both first-class (P8): every token in both, material tuned per theme, never inverted", () => {
    expect(Object.keys(themes).sort()).toEqual(["litt-dark", "litt-light"]);
    expect(Object.keys(littDark.colors).sort()).toEqual(Object.keys(littLight.colors).sort());
    expect(littDark.material.light).toBe(22);
    expect(littLight.material.light).toBe(12);
    expect(littDark.material.grain).toBe(0.04);
    expect(littLight.material.grain).toBe(0.02);
    for (const h of DATA_HUES) expect(littDark.colors[`data-${h}-text`]).toMatch(/^#/);
  });

  it("two inks: body and metadata share one grey", () => {
    for (const t of [littDark, littLight]) expect(t.colors["fg-muted"]).toBe(t.colors["fg-subtle"]);
  });

  it("radii are litt's at 2×; no shadow has an offset (P4)", () => {
    expect(littDark.radius).toEqual({ control: 8, surface: 16 });
    for (const t of [littDark, littLight])
      for (const k of ["shadowTooltip", "shadowFloat", "shadowModal"] as const)
        for (const layer of t.material[k].split(/,(?![^(]*\))/)) expect(layer.trim(), `${t.name}.${k}`).toMatch(/^0 0 /);
  });
});

describe("kit CSS", () => {
  it("roles carry weight; the root turns synthesis off", () => {
    const css = kitCss(littKit);
    expect(css).toContain("#root{font-synthesis:none;font-weight:400}");
    expect(css).toContain(".font-display{font-weight:500}");
    expect(css).toContain(".font-mono{font-weight:400}");
  });

  it("scoped kits re-declare fonts and reset every role property", () => {
    const css = kitCss(littKit, '[data-ct-type="litt"]');
    expect(css).toMatch(/^\[data-ct-type="litt"\]\{--font-display:"Geist"/);
    expect(css).toContain("font-family:var(--font-sans)");
    expect(css).toContain('[data-ct-type="litt"] .font-display{font-weight:500;font-stretch:normal;font-variation-settings:normal;font-feature-settings:normal}');
    expect(css).toContain("--text-display--letter-spacing:-0.04em");
  });

  it("only Geist faces ship", () => {
    const css = fontFaceCss(buildFamilies([littKit]));
    expect(css).toContain('font-family:"Geist"');
    expect(css).toContain('font-family:"Geist Mono"');
    expect(css).not.toMatch(/Inter|Newsreader|Fraunces|Archivo|Instrument/);
  });

  it("compiles litt's tokens, the portrait scale and the material, with roles between base and utilities", async () => {
    const css = await compileCss(littDark, littKit, [], ["font-display", "font-title", "font-label", "text-display", "text-label", "rounded-control", "rounded-surface", "shadow-raised", "shadow-glow", "bg-canvas", "text-fg-muted", "bg-data-blue-tint"], PKG_ROOT);
    expect(css).toContain("@layer theme, base, components, utilities;");
    expect(css).toContain("--color-canvas: #0a0908");
    expect(css).toContain("--text-display: 112px");
    expect(css).toContain("--text-label: 28px");
    expect(css).toContain("--radius-control: 8px");
    expect(css).toContain("--font-weight-label: 600");
    expect(css).toContain("color-mix(in oklab, var(--color-data-blue) 18%, var(--color-surface-1))");
    expect(css).toContain(".ct-lit");
    expect(css).not.toMatch(/"ss01"|aurora|accent-2/);
    const portrait = await compileCss(littDark, littKit, [], ["text-label"], PKG_ROOT, true);
    expect(portrait).toContain("--text-label: 34px");
  });
});
