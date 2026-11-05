import type { FxSpec } from "./types.js";

/**
 * Shape presentations for transitions (and any element): a pure function of
 * one progress channel `fx` (0 = hidden, 1 = fully revealed) and a static,
 * serialisable spec. Bundled into the runtime; deterministic per frame.
 *
 * - wipe: linear-gradient mask, feathered edge, any angle (CSS gradient angle: 90 = edge travels right)
 * - pixels: an SVG mask of square cells, revealed in a 4×4 ordered dither that sweeps along the angle
 */
export interface FxStyle {
  maskImage?: string;
  clipPath?: string;
}

const f2 = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
};

/** Feathered edge stops: fully transparent at p=0, fully opaque at p=1. */
function edge(p: number, feather: number): [number, number] {
  const a = p * (100 + feather) - feather;
  return [a, a + Math.max(feather, 0.01)];
}

/** The 4×4 Bayer matrix: the order an ordered dither lights its cells in. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** How much of a cell's turn comes from the sweep (the rest from the dither): enough to read as a direction. */
const SWEEP = 0.6;

/** When cell (c, r) lights, 0..1: its place along the sweep, broken up by the dither. */
export function cellThreshold(spec: Extract<FxSpec, { kind: "pixels" }>, c: number, r: number): number {
  const a = (spec.angle * Math.PI) / 180;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const along = (x: number, y: number) => x * ux + y * uy;
  const ends = [along(0, 0), along(spec.cols, 0), along(0, spec.rows), along(spec.cols, spec.rows)];
  const lo = Math.min(...ends);
  const s = (along(c + 0.5, r + 0.5) - lo) / (Math.max(...ends) - lo);
  return SWEEP * s + (1 - SWEEP) * ((BAYER[(r % 4) * 4 + (c % 4)] + 0.5) / 16);
}

function pixels(spec: Extract<FxSpec, { kind: "pixels" }>, p: number): FxStyle {
  let d = "";
  for (let r = 0; r < Math.ceil(spec.rows); r++) for (let c = 0; c < spec.cols; c++) if (cellThreshold(spec, c, r) < p) d += "M" + c + " " + r + "h1v1h-1z";
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + spec.cols + " " + f2(spec.rows) + "' preserveAspectRatio='none'><path d='" + d + "'/></svg>";
  return { maskImage: 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")' };
}

export function fxStyle(spec: FxSpec, p: number): FxStyle {
  if (p >= 1) return { maskImage: "none" };
  if (spec.kind === "pixels") return pixels(spec, p);
  const [a, b] = edge(Math.max(0, p), spec.feather);
  return { maskImage: "linear-gradient(" + f2(spec.angle) + "deg, #000 " + f2(a) + "%, transparent " + f2(b) + "%)" };
}
