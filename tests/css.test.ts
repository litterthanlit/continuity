import { describe, expect, it } from "vitest";
import { buildFamilies, compileCss, fontFaceCss, kitCss } from "../src/build/css.js";
import { PKG_ROOT } from "../src/paths.js";
import { hasTabularFigures } from "../src/themes/fonts.js";
import { monoDark } from "../src/themes/index.js";
import { classicKit, defineKit, KIT_NAMES, resolveKit, typeKits } from "../src/themes/kits.js";

describe("type kits", () => {
  it("every kit's figures role has tabular figures (Stat, counters)", () => {
    for (const k of Object.values(typeKits)) expect(hasTabularFigures(k.roles[k.figures].family), k.name).toBe(true);
  });

  it("role weights and widths sit inside what the vendored files can draw", () => {
    for (const k of Object.values(typeKits)) {
      for (const [role, r] of Object.entries(k.roles)) {
        const [lo, hi] = r.family.axes.wght ?? [Number(r.family.faces[0].weight), Number(r.family.faces[0].weight)];
        const statics = r.family.faces.map((f) => f.weight);
        if (r.family.axes.wght) expect(r.weight, `${k.name}.${role}`).toBeGreaterThanOrEqual(lo);
        if (r.family.axes.wght) expect(r.weight, `${k.name}.${role}`).toBeLessThanOrEqual(hi);
        else expect(statics, `${k.name}.${role}`).toContain(String(r.weight));
        if (r.width !== undefined && r.width !== 100) {
          const w = r.family.axes.wdth;
          expect(w, `${k.name}.${role} width`).toBeDefined();
          expect(r.width).toBeGreaterThanOrEqual(w![0]);
          expect(r.width).toBeLessThanOrEqual(w![1]);
        }
        for (const axis of Object.keys(r.axes ?? {})) expect(Object.keys(r.family.axes), `${k.name}.${role} ${axis}`).toContain(axis);
      }
    }
  });

  it("serif display faces stay above hairline weights (video compression)", () => {
    for (const k of Object.values(typeKits)) if (k.roles.display.family.category === "serif") expect(k.roles.display.weight).toBeGreaterThanOrEqual(320);
  });

  it("resolves storyboard type > theme type > classic", () => {
    expect(resolveKit(monoDark).name).toBe("classic");
    expect(resolveKit(monoDark, "wonk").name).toBe("wonk");
    expect(resolveKit({ ...monoDark, type: "atelier" }).name).toBe("atelier");
    expect(resolveKit({ ...monoDark, type: "atelier" }, "terminal").name).toBe("terminal");
    expect(() => resolveKit(monoDark, "nope")).toThrow(/Unknown type kit/);
    expect(KIT_NAMES).toHaveLength(6);
  });

  it("defineKit merges per role", () => {
    const k = defineKit("swiss", { name: "brand", roles: { display: { weight: 700 } } });
    expect(k.roles.display.weight).toBe(700);
    expect(k.roles.display.family.family).toBe("Geist");
    expect(k.roles.sans).toBe(typeKits.swiss.roles.sans);
  });
});

describe("kit CSS", () => {
  it("classic emits no role rules", () => {
    expect(kitCss(classicKit(monoDark))).toBe("");
  });

  it("v2 roles carry weight, width, axes and case", () => {
    const css = kitCss(typeKits.broadside);
    expect(css).toContain(".font-display{font-weight:850;font-stretch:66%;text-transform:uppercase}");
    expect(css).toContain("#root{font-synthesis:none;font-weight:500}");
    expect(css).toContain(".ct-label{text-transform:uppercase;--tw-tracking:0.08em;letter-spacing:0.08em}");
    expect(css).toContain(".ct-accent{font-size:1.03em;--tw-tracking:0em;letter-spacing:0em;text-transform:none}");
    expect(kitCss(typeKits.wonk)).toContain('.font-display{font-weight:400;font-variation-settings:"SOFT" 100, "WONK" 1}');
  });

  it("scoped kits re-declare fonts and reset every role property", () => {
    const css = kitCss(typeKits.swiss, '[data-ct-type="swiss"]');
    expect(css).toMatch(/^\[data-ct-type="swiss"\]\{--font-display:"Geist"/);
    expect(css).toContain("font-family:var(--font-sans)");
    expect(css).toContain('[data-ct-type="swiss"] .font-display{font-weight:600;font-stretch:normal;font-variation-settings:normal;text-transform:none;font-feature-settings:normal}');
    expect(css).toContain("--text-h1--letter-spacing:-0.05em");
  });

  it("width-variable faces declare their stretch range", () => {
    expect(fontFaceCss(buildFamilies([typeKits.broadside]))).toContain("font-stretch:62% 125%;");
  });

  it("classic compiles without a components layer; v2 puts roles between base and utilities", async () => {
    const classic = await compileCss(monoDark, classicKit(monoDark), [], ["font-display", "text-h1"], PKG_ROOT);
    expect(classic).toContain('"ss01" on');
    expect(classic).not.toContain("font-synthesis");
    const v2 = await compileCss(monoDark, typeKits.swiss, [typeKits.wonk], ["font-display", "font-bold", "text-h1", "tracking-wide"], PKG_ROOT);
    expect(v2).not.toContain('"ss01" on');
    // The layer order statement (not source order) puts components after base and before utilities.
    expect(v2).toContain("@layer theme, base, components, utilities;");
    const comp = v2.slice(v2.indexOf("@layer components"));
    expect(comp).toContain('[data-ct-type="wonk"] .font-display');
    expect(v2).toContain('--font-display: "Geist"');
    expect(v2).toContain("--text-h1--letter-spacing: -0.05em");
  });
});
