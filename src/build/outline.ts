import * as fontkit from "fontkit";
import { resolveDep } from "../paths.js";
import { familyByName } from "../themes/fonts.js";

/**
 * Build-time text → SVG outline from the vendored Geist faces, so a morph can
 * start or end on a wordmark. Coordinates are px, y down, origin at the left
 * of the first glyph's advance box, baseline at y = ascent.
 */
export interface Outline {
  /** M/L/Q/C/Z path data, px. */
  d: string;
  /** Advance width including tracking after every glyph. */
  width: number;
  /** (ascent + descent) · scale. */
  height: number;
  /** Baseline y, equal to `ascent`. */
  baseline: number;
  ascent: number;
  /** Positive distance below the baseline. */
  descent: number;
}

/** The slice of fontkit's TTF/WOFF2 font object this module touches (fontkit ships no types). */
interface VarFont {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  fvar: { axis: { axisTag: string; minValue: number; defaultValue: number; maxValue: number }[] };
  variationCoords: number[] | null;
  getGlyph(id: number): unknown;
  layout(text: string): {
    glyphs: { path: { commands: { command: string; args: number[] }[] } }[];
    positions: { xAdvance: number; xOffset: number; yOffset: number }[];
  };
  _variationProcessor: { transformPoints(id: number, points: Point[]): void } | null;
  _transformedGlyphs?: TransformedGlyph[];
}

interface Point { onCurve: boolean; endContour: boolean; x: number; y: number; copy(): Point }
interface TransformedGlyph {
  numberOfContours: number;
  points?: Point[];
  components?: { dx: number; dy: number }[];
}

const cache = new Map<string, VarFont>();

/**
 * fontkit 2.0.4 cannot vary a WOFF2 face: `getVariation` re-reads the
 * compressed stream as a TTF, and with `variationCoords` set directly its
 * whole-table glyf decoder crashes on composite glyphs and never applies gvar
 * deltas to outlines anyway. So: decode the glyf table on a coordinate-free
 * instance, then run the variation processor over every glyph the way the TTF
 * path does, and hand the result to an instance that carries the coordinates
 * (HVAR advances come from there). A face that is not table-transformed takes
 * fontkit's own TTF decode path, which applies the deltas itself.
 */
function openAt(file: string, weight: number): VarFont {
  const key = `${file}@${weight}`;
  let font = cache.get(key);
  if (font) return font;
  const path = resolveDep(file);
  const plain = fontkit.openSync(path) as VarFont;
  plain.getGlyph(0);
  font = fontkit.openSync(path) as VarFont;
  font.variationCoords = font.fvar.axis.map((a) => (a.axisTag.trim() === "wght" ? Math.min(a.maxValue, Math.max(a.minValue, weight)) : a.defaultValue));
  const vp = font._variationProcessor;
  const glyphs = plain._transformedGlyphs;
  if (vp && glyphs) {
    const point = (x: number, y: number): Point => ({ onCurve: true, endContour: true, x, y, copy() { return point(this.x, this.y); } });
    const phantom = (): Point[] => Array.from({ length: 4 }, () => point(0, 0));
    glyphs.forEach((g, id) => {
      if (g.points && g.numberOfContours > 0) vp.transformPoints(id, [...g.points, ...phantom()]);
      else if (g.components && g.numberOfContours < 0) {
        const pts = g.components.map((c) => point(c.dx, c.dy));
        vp.transformPoints(id, [...pts, ...phantom()]);
        g.components.forEach((c, i) => { c.dx = pts[i].x; c.dy = pts[i].y; });
      }
    });
    font._transformedGlyphs = glyphs;
  }
  cache.set(key, font);
  return font;
}

export function textOutline(
  text: string,
  opts: { size: number; weight?: number; family?: "Geist" | "Geist Mono"; tracking?: number },
): Outline {
  const family = familyByName(opts.family ?? "Geist");
  const face = family?.faces.find((f) => f.style === "normal");
  if (!family || !face) throw new Error(`textOutline: unknown family ${opts.family}`);
  const font = openAt(face.file, opts.weight ?? 500);
  const scale = opts.size / font.unitsPerEm;
  const ascent = font.ascent * scale;
  const descent = Math.abs(font.descent) * scale;
  const tracking = (opts.tracking ?? 0) * opts.size;
  const run = font.layout(text);
  const fmt = (v: number) => {
    const r = Math.round(v * 100) / 100;
    return String(r === 0 ? 0 : r);
  };
  let pen = 0;
  let d = "";
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const ox = pen + pos.xOffset * scale, oy = ascent - pos.yOffset * scale;
    const pt = (x: number, y: number) => `${fmt(ox + x * scale)} ${fmt(oy - y * scale)}`;
    for (const { command, args: a } of glyph.path.commands) {
      switch (command) {
        case "moveTo": d += `M${pt(a[0], a[1])}`; break;
        case "lineTo": d += `L${pt(a[0], a[1])}`; break;
        case "quadraticCurveTo": d += `Q${pt(a[0], a[1])} ${pt(a[2], a[3])}`; break;
        case "bezierCurveTo": d += `C${pt(a[0], a[1])} ${pt(a[2], a[3])} ${pt(a[4], a[5])}`; break;
        case "closePath": d += "Z"; break;
      }
    }
    pen += pos.xAdvance * scale + tracking;
  });
  return { d, width: pen, height: ascent + descent, baseline: ascent, ascent, descent };
}
