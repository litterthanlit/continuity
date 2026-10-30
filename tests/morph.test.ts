import * as fontkit from "fontkit";
import { describe, expect, it } from "vitest";
import { textOutline } from "../src/build/outline.js";
import { areaOf, boundsOf, mapContours, morphAt, parsePath, prepareContours, prepareMorph, resample, toPathD, type Contour } from "../src/motion/morph.js";
import { resolveDep } from "../src/paths.js";
import { fonts } from "../src/themes/fonts.js";

const circle = (cx: number, cy: number, r: number, sweep = 1) =>
  `M${cx - r} ${cy}A${r} ${r} 0 1 ${sweep} ${cx + r} ${cy}A${r} ${r} 0 1 ${sweep} ${cx - r} ${cy}Z`;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}z`;
const within = (actual: number, expected: number, rel: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * rel);
const areas = (cs: Contour[]) => cs.map((c) => Math.abs(areaOf(c))).sort((a, b) => b - a);
const allFinite = (cs: Contour[]) => cs.every((c) => c.every(Number.isFinite));

describe("parsePath", () => {
  it("a unit square written seven ways gives the same polygon", () => {
    const ways = [
      "M0 0 L1 0 L1 1 L0 1 Z",
      "M0 0 l1 0 l0 1 l-1 0 z",
      "M0 0 H1 V1 H0 Z",
      "m0 0 h1 v1 h-1 z",
      "M0,0 1,0 1,1 0,1z",
      "M0 0C0 0 1 0 1 0S1 1 1 1Q0 1 0 1T0 0Z",
      "M0 0l1e0 0 0 1-1 0z",
    ];
    const reference = resample(parsePath(ways[0])[0], 8);
    for (const d of ways) {
      const cs = parsePath(d);
      expect(cs, d).toHaveLength(1);
      expect(areaOf(cs[0]), d).toBeCloseTo(1, 9);
      const pts = resample(cs[0], 8);
      pts.forEach((v, i) => expect(v, `${d} point ${i}`).toBeCloseTo(reference[i], 9));
    }
  });

  it("reads compact numbers and flags", () => {
    expect(boundsOf(parsePath("M.5.5L1.5.5 1.5 1.5.5 1.5Z"))).toEqual({ x: 0.5, y: 0.5, width: 1, height: 1 });
    expect(boundsOf(parsePath("M-1-2L1-2 1 2-1 2Z"))).toEqual({ x: -1, y: -2, width: 2, height: 4 });
    expect(boundsOf(parsePath("M0 0 1e1 0 1E1 1e+1 0 10Z"))).toEqual({ x: 0, y: 0, width: 10, height: 10 });
    const half = parsePath("M0 0A5 5 0 1010 0Z", 0.01);
    expect(half).toHaveLength(1);
    within(Math.abs(areaOf(half[0])), (Math.PI * 25) / 2, 0.01);
  });

  it("splits subpaths, closes implicitly and drops degenerate ones", () => {
    const cs = parsePath("M0 0h10v10h-10 M20 0h10v10h-10z M50 50 M60 60L61 61");
    expect(cs).toHaveLength(2);
    expect(areas(cs)).toEqual([100, 100]);
    expect(boundsOf(cs)).toEqual({ x: 0, y: 0, width: 30, height: 10 });
  });

  it("S and T reflect the previous control point", () => {
    const s = parsePath("M0 0C0 10 10 10 10 0S20 -10 20 0Z", 0.01);
    expect(boundsOf(s).y).toBeCloseTo(-7.5, 1);
    expect(boundsOf(s).y + boundsOf(s).height).toBeCloseTo(7.5, 1);
    const t = parsePath("M0 0Q5 10 10 0T20 0Z", 0.01);
    expect(boundsOf(t).y).toBeCloseTo(-5, 1);
  });

  it("an arc-drawn circle has the right area and the sweep flag sets its orientation", () => {
    const [c] = parsePath(circle(0, 0, 100));
    within(Math.abs(areaOf(c)), Math.PI * 100 * 100, 0.005);
    expect(Math.sign(areaOf(parsePath(circle(0, 0, 100, 0))[0]))).toBe(-Math.sign(areaOf(c)));
    expect(boundsOf([c]).x).toBeCloseTo(-100, 6);
    expect(boundsOf([c]).width).toBeCloseTo(200, 6);
  });

  it("scales up radii that are too small for the chord (Appendix F.6.6)", () => {
    const [c] = parsePath("M0 0A1 1 0 0 0 10 0Z", 0.01);
    within(Math.abs(areaOf(c)), (Math.PI * 25) / 2, 0.005);
    expect(boundsOf([c]).height).toBeCloseTo(5, 1);
  });

  it("flattens a rotated ellipse arc to the requested tolerance", () => {
    const [c] = parsePath("M0 0A40 20 30 1 1 1 0Z", 0.05);
    expect(allFinite([c])).toBe(true);
    const loose = parsePath("M0 0A40 20 30 1 1 1 0Z", 2)[0];
    expect(c.length).toBeGreaterThan(loose.length);
    within(Math.abs(areaOf(c)), Math.PI * 40 * 20, 0.01);
  });

  it("rejects malformed data", () => {
    expect(() => parsePath("1 2 L3 4")).toThrow(/command/);
    expect(() => parsePath("M0 0 L1")).toThrow(/number/);
    expect(() => parsePath("M0 0 Z 1 2")).toThrow(/after Z/);
  });
});

describe("contour geometry", () => {
  it("resample spaces points evenly by arc length from the first point", () => {
    for (const d of ["M0 0h100v100h-100z", "M0 0L50 0L100 0L100 100L0 100Z"]) {
      const pts = resample(parsePath(d)[0], 40);
      expect(pts).toHaveLength(80);
      expect([pts[0], pts[1]]).toEqual([0, 0]);
      for (let i = 0; i < 80; i += 2) {
        const j = (i + 2) % 80;
        within(Math.hypot(pts[j] - pts[i], pts[j + 1] - pts[i + 1]), 10, 0.01);
      }
    }
    expect(resample([3, 4], 3)).toEqual([3, 4, 3, 4, 3, 4]);
  });

  it("areaOf is signed and boundsOf spans every contour", () => {
    expect(areaOf([0, 0, 2, 0, 2, 2, 0, 2])).toBe(4);
    expect(areaOf([0, 0, 0, 2, 2, 2, 2, 0])).toBe(-4);
    expect(boundsOf([[0, 0, 1, 1], [5, -2, 6, 3]])).toEqual({ x: 0, y: -2, width: 6, height: 5 });
    expect(boundsOf([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("mapContours applies the function to every vertex", () => {
    expect(mapContours([[1, 2, 3, 4], [5, 6]], (x, y) => [x * 2, y + 1])).toEqual([[2, 3, 6, 5], [10, 7]]);
  });

  it("toPathD rounds and never prints -0 or NaN", () => {
    expect(toPathD([[-0.001, 0.004, 1.006, -0, 2.5, 3]])).toBe("M0 0L1.01 0L2.5 3Z");
    expect(toPathD([[0.4, -0.4]], 0)).toBe("M0 0Z");
    expect(toPathD([[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12]])).toBe("M1 2L3 4L5 6ZM7 8L9 10L11 12Z");
    expect(toPathD([])).toBe("");
  });
});

describe("morph", () => {
  const noBadNumbers = (s: string) => {
    expect(s).not.toMatch(/NaN|Infinity/);
    expect(s).not.toMatch(/(^|[^\d.])-0(?![\d.])/);
  };

  it("endpoints reproduce each input polygon and v is clamped", () => {
    const inputs = [circle(0, 0, 100), rect(-100, -100, 200, 200)];
    const data = prepareMorph(inputs);
    expect(data.shapes).toHaveLength(2);
    inputs.forEach((d, i) => {
      const want = parsePath(d);
      const got = morphAt(data, i);
      expect(got).toHaveLength(want.length);
      within(Math.abs(areaOf(got[0])), Math.abs(areaOf(want[0])), 0.005);
      const a = boundsOf(got), b = boundsOf(want);
      for (const k of ["x", "y", "width", "height"] as const) expect(Math.abs(a[k] - b[k]), k).toBeLessThanOrEqual(0.5);
    });
    expect(morphAt(data, 7)).toEqual(morphAt(data, 1));
    expect(morphAt(data, -3)).toEqual(morphAt(data, 0));
    expect(morphAt(data, Number.NaN)).toEqual(morphAt(data, 0));
  });

  it("circle → square keeps its area between the two at v = 0.5 (no twist)", () => {
    const data = prepareMorph([circle(0, 0, 100), rect(-100, -100, 200, 200)]);
    const lo = Math.PI * 100 * 100, hi = 200 * 200;
    const mid = Math.abs(areaOf(morphAt(data, 0.5)[0]));
    expect(mid).toBeGreaterThan(lo);
    expect(mid).toBeLessThan(hi);
    const quarter = Math.abs(areaOf(morphAt(data, 0.25)[0]));
    expect(quarter).toBeGreaterThan(lo);
    expect(quarter).toBeLessThan(mid);
  });

  it("aligns a reversed or rotated copy of the same contour onto itself", () => {
    const square = parsePath(rect(0, 0, 100, 100))[0];
    const reversed = parsePath("M0 0v100h100v-100z")[0];
    const rotated = parsePath("M100 100h-100v-100h100z")[0];
    for (const other of [reversed, rotated]) {
      const data = prepareContours([[square], [other]]);
      const [a] = morphAt(data, 0), [b] = morphAt(data, 1);
      let travel = 0;
      for (let i = 0; i < a.length; i++) travel += Math.abs(a[i] - b[i]);
      expect(travel).toBeLessThan(1e-6);
    }
  });

  it("keeps every vertex when the budget allows, so endpoints are exact", () => {
    const tri = [0, 0, 300, 0, 150, 260];
    const data = prepareContours([[tri], [parsePath(circle(150, 90, 80))[0]]], { samples: 60 });
    const [start] = morphAt(data, 0);
    expect(start.length / 2).toBeGreaterThanOrEqual(24);
    expect(areaOf(start)).toBeCloseTo(areaOf(tri), 9);
    expect(boundsOf([start])).toEqual(boundsOf([tri]));
    for (let i = 0; i < 6; i += 2) expect(start.indexOf(tri[i])).toBeGreaterThanOrEqual(0);
    const gaps: number[] = [];
    for (let i = 0; i < start.length; i += 2) {
      const j = (i + 2) % start.length;
      gaps.push(Math.hypot(start[j] - start[i], start[j + 1] - start[i + 1]));
    }
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.6);
  });

  it("the point budget follows perimeter with a floor of 24 per contour", () => {
    const data = prepareContours([[parsePath(rect(0, 0, 300, 300))[0], parsePath(rect(500, 0, 10, 10))[0]]], { samples: 240 });
    const counts = data.shapes[0].map((c) => c.length / 2);
    expect(counts[0]).toBeGreaterThan(200);
    expect(counts[1]).toBe(24);
    const small = prepareContours([[parsePath(rect(0, 0, 1, 1))[0]]], { samples: 10 });
    expect(small.shapes[0][0].length / 2).toBe(24);
  });

  it("ring → bar: the hole collapses to a point, areas are right at the ends", () => {
    const ring = `${circle(0, 0, 100)}${circle(0, 0, 60, 0)}`;
    const data = prepareMorph([ring, rect(-100, -20, 200, 40)]);
    expect(data.shapes[0]).toHaveLength(2);
    expect(data.shapes[1]).toHaveLength(2);
    const start = areas(morphAt(data, 0)), input = areas(parsePath(ring));
    within(start[0], input[0], 0.005);
    within(start[1], input[1], 0.005);
    within(input[1], Math.PI * 60 * 60, 0.01);
    const end = areas(morphAt(data, 1));
    within(end[0], 8000, 0.005);
    expect(end[1]).toBe(0);
    const pt = morphAt(data, 1)[1];
    expect(pt[0]).toBeCloseTo(0, 9);
    expect(pt[1]).toBeCloseTo(0, 9);
    for (let v = 0; v <= 1; v += 0.1) {
      const cs = morphAt(data, v);
      expect(allFinite(cs), `v=${v}`).toBe(true);
      noBadNumbers(toPathD(cs));
    }
  });

  it("3-part mark → 1 part and back: every frame finite, the right areas at the ends", () => {
    const mark = [circle(-60, 0, 20), circle(0, 0, 20), circle(60, 0, 20)].join("");
    const data = prepareMorph([mark, rect(-100, -20, 200, 40), mark]);
    // The bar takes the middle circle's slot; the other two collapse. On the way
    // back only that slot is live, so the other two parts get fresh slots and grow
    // from their own centroids instead of sliding over from a dead one.
    expect(data.shapes.map((s) => s.length)).toEqual([5, 5, 5]);
    const disc = Math.abs(areaOf(parsePath(circle(0, 0, 20))[0]));
    for (const v of [0, 2]) {
      const a = areas(morphAt(data, v));
      a.slice(0, 3).forEach((x) => within(x, disc, 0.005));
      expect(a.slice(3)).toEqual([0, 0]);
    }
    const mid = areas(morphAt(data, 1));
    within(mid[0], 8000, 0.005);
    expect(mid.slice(1)).toEqual([0, 0, 0, 0]);
    const growing = morphAt(data, 1.5);
    const live = growing.map((c, i) => ({ c, i })).filter(({ c }) => Math.abs(areaOf(c)) > 1e-9);
    expect(live.map(({ i }) => i).sort()).toEqual([1, 3, 4]);
    for (const { c, i } of live) {
      const target = morphAt(data, 2)[i];
      if (i === 1) continue;
      const [gx, gy] = [boundsOf([c]).x + boundsOf([c]).width / 2, boundsOf([c]).y + boundsOf([c]).height / 2];
      const [tx, ty] = [boundsOf([target]).x + boundsOf([target]).width / 2, boundsOf([target]).y + boundsOf([target]).height / 2];
      expect(Math.hypot(gx - tx, gy - ty), `slot ${i} grows in place`).toBeLessThan(0.5);
    }
    for (let v = 0; v <= 2; v += 0.125) {
      const cs = morphAt(data, v);
      expect(allFinite(cs), `v=${v}`).toBe(true);
      noBadNumbers(toPathD(cs));
    }
    const halfway = morphAt(data, 0.5);
    expect(areas(halfway)[0]).toBeGreaterThan(Math.PI * 400);
    expect(areas(halfway)[0]).toBeLessThan(8000);
  });

  it("is deterministic", () => {
    const paths = [circle(10, 10, 50), `${rect(0, 0, 80, 120)}${circle(40, 60, 20, 0)}`];
    const a = prepareMorph(paths), b = prepareMorph(paths);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(toPathD(morphAt(a, 0.37))).toBe(toPathD(morphAt(b, 0.37)));
  });

  it("prepareContours matches prepareMorph on the same geometry and morphAt returns copies", () => {
    const paths = [circle(0, 0, 50), rect(-50, -50, 100, 100)];
    const a = prepareMorph(paths), b = prepareContours(paths.map((d) => parsePath(d)));
    expect(a).toEqual(b);
    const frame = morphAt(a, 0);
    frame[0][0] = 12345;
    expect(morphAt(a, 0)[0][0]).not.toBe(12345);
    expect(prepareContours([])).toEqual({ shapes: [] });
  });
});

describe("textOutline", () => {
  type Fk = { unitsPerEm: number; layout(s: string): { advanceWidth: number } };
  const plain = fontkit.openSync(resolveDep(fonts.geist.faces[0].file)) as Fk;

  it("Ship at 112px: ≥ 4 contours, width matches fontkit's advance, identical across calls", () => {
    const o = textOutline("Ship", { size: 112 });
    expect(parsePath(o.d).length).toBeGreaterThanOrEqual(4);
    // fontkit can only lay out the default instance (wght 400); litt's 500 runs ~2% wider.
    const advance400 = (plain.layout("Ship").advanceWidth / plain.unitsPerEm) * 112;
    within(textOutline("Ship", { size: 112, weight: 400 }).width, advance400, 0.001);
    expect(o.width).toBeGreaterThan(advance400);
    within(o.width, advance400, 0.05);
    expect(textOutline("Ship", { size: 112 })).toEqual(o);
  });

  it("lays out px, y down, baseline at ascent", () => {
    const o = textOutline("Ship", { size: 112 });
    expect(o.baseline).toBe(o.ascent);
    expect(o.height).toBeCloseTo(o.ascent + o.descent, 9);
    expect(o.height).toBeCloseTo(1.3 * 112, 6);
    const b = boundsOf(parsePath(o.d));
    expect(b.x).toBeGreaterThanOrEqual(-1);
    expect(b.y).toBeGreaterThan(0);
    expect(b.y + b.height).toBeGreaterThan(o.baseline);
    expect(b.y + b.height).toBeLessThanOrEqual(o.height);
    const top = boundsOf(parsePath(textOutline("x", { size: 100 }).d));
    expect(top.y).toBeGreaterThan(boundsOf(parsePath(textOutline("H", { size: 100 }).d)).y);
    expect(top.y + top.height).toBeCloseTo(textOutline("x", { size: 100 }).baseline, 0);
  });

  it("applies the variable weight to outlines and advances", () => {
    const light = textOutline("Ship", { size: 112, weight: 300 });
    const bold = textOutline("Ship", { size: 112, weight: 800 });
    expect(bold.d).not.toBe(light.d);
    expect(bold.width).toBeGreaterThan(light.width);
    const stem = (w: number) => boundsOf(parsePath(textOutline("l", { size: 100, weight: w }).d)).width;
    expect(stem(800)).toBeGreaterThan(stem(300) * 1.5);
  });

  it("adds tracking after every glyph and supports Geist Mono", () => {
    const base = textOutline("Ship", { size: 112 });
    expect(textOutline("Ship", { size: 112, tracking: 0.1 }).width).toBeCloseTo(base.width + 4 * 11.2, 6);
    const mono = (s: string) => textOutline(s, { size: 50, family: "Geist Mono" }).width;
    expect(mono("ii")).toBeCloseTo(mono("mm"), 6);
    expect(mono("ii")).not.toBeCloseTo(textOutline("ii", { size: 50 }).width, 1);
    expect(textOutline("", { size: 50 })).toMatchObject({ d: "", width: 0 });
  });
});

describe("collapse into the other shape", () => {
  it("pours a contour with no counterpart into the nearest point of the other shape", () => {
    const square = (x: number, y: number, s: number) => `M${x} ${y}H${x + s}V${y + s}H${x}Z`;
    const two = `${square(0, 0, 10)} ${square(100, 0, 10)}`;
    const one = square(0, 0, 10);
    const into = prepareMorph([two, one], { collapse: "into" });
    const inPlace = prepareMorph([two, one]);
    const vertices = (c: number[]) => Array.from({ length: c.length / 2 }, (_, k) => [c[2 * k], c[2 * k + 1]]);
    const target = into.shapes[1].find((c) => new Set(vertices(c).map((v) => v.join())).size === 1)!;
    const [px, py] = target;
    expect(px).toBeLessThanOrEqual(10); // on the remaining square, not at x ≈ 105
    expect(vertices(into.shapes[1].find((c) => c !== target)!).some(([x, y]) => x === px && y === py)).toBe(true);
    const lone = inPlace.shapes[1].find((c) => new Set(vertices(c).map((v) => v.join())).size === 1)!;
    expect(lone[0]).toBeCloseTo(105, 6); // the default still shrinks in place
  });
});
