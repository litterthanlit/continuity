import * as fontkit from "fontkit";
import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDep } from "../src/paths.js";
import { fonts, symbolFonts, type FontFamily } from "../src/themes/fonts.js";

type Fk = { variationAxes: Record<string, { min: number; max: number }>; availableFeatures: string[] };
const open = (file: string) => fontkit.openSync(resolveDep(file)) as unknown as Fk;
const all: FontFamily[] = [...Object.values(fonts), ...symbolFonts];

describe("font registry", () => {
  it("every face resolves to a vendored woff2", () => {
    for (const f of all) for (const face of f.faces) expect(resolveDep(face.file)).toMatch(/\.woff2$/);
  });

  it("face basenames are unique (builds copy fonts by basename)", () => {
    const names = all.flatMap((f) => f.faces.map((face) => basename(face.file)));
    expect(new Set(names).size).toBe(names.length);
  });

  it("is OFL only", () => {
    for (const f of all) expect(f.license).toBe("OFL-1.1");
  });

  it("declared axes, weights and widths match the files", () => {
    for (const f of Object.values(fonts)) {
      for (const face of f.faces) {
        const axes = open(face.file).variationAxes;
        const declared = Object.entries(f.axes);
        if (!face.weight.includes(" ")) {
          // Static face: no variation axes at all.
          expect(Object.keys(axes), `${f.family} ${face.file}`).toEqual([]);
          continue;
        }
        expect(Object.keys(axes).sort(), `${f.family} axes`).toEqual(declared.map(([k]) => k).sort());
        for (const [tag, [min, max]] of declared) {
          expect([axes[tag].min, axes[tag].max], `${f.family} ${tag}`).toEqual([min, max]);
        }
        expect(face.weight).toBe(`${axes.wght.min} ${axes.wght.max}`);
        if (axes.wdth) expect(face.stretch).toBe(`${axes.wdth.min}% ${axes.wdth.max}%`);
        else expect(face.stretch).toBeUndefined();
      }
    }
  });

  it("the tnum flag matches the files", () => {
    for (const f of Object.values(fonts)) {
      expect(open(f.faces[0].file).availableFeatures.includes("tnum"), f.family).toBe(f.tnum);
    }
  });
});
