import { easeFn } from "./easing.js";
import type { EaseSpec, FxSpec } from "./types.js";

/**
 * Shape presentations for transitions (and any element): a pure function of
 * one progress channel `fx` (0 = hidden, 1 = fully revealed) and a static,
 * serialisable spec. Bundled into the runtime; deterministic per frame.
 *
 * - wipe:   linear-gradient mask, feathered edge, any angle (CSS gradient angle: 90 = edge travels right)
 * - iris:   radial-gradient mask from an origin, radius to the farthest corner
 * - strips: one "skyline" polygon clip — n strips revealed with a stagger, each eased
 */
export interface FxStyle {
  maskImage?: string;
  clipPath?: string;
}

const f2 = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
};

const easeCache = new Map<string, (p: number) => number>();
function cached(e: EaseSpec) {
  const k = JSON.stringify(e);
  let f = easeCache.get(k);
  if (!f) easeCache.set(k, (f = easeFn(e)));
  return f;
}

/** Feathered edge stops: fully transparent at p=0, fully opaque at p=1. */
function edge(p: number, feather: number): [number, number] {
  const a = p * (100 + feather) - feather;
  return [a, a + Math.max(feather, 0.01)];
}

export function fxStyle(spec: FxSpec, p: number): FxStyle {
  if (p >= 1) return spec.kind === "strips" ? { clipPath: "none" } : { maskImage: "none" };
  const q = Math.max(0, p);
  switch (spec.kind) {
    case "wipe": {
      const [a, b] = edge(q, spec.feather);
      return { maskImage: "linear-gradient(" + f2(spec.angle) + "deg, #000 " + f2(a) + "%, transparent " + f2(b) + "%)" };
    }
    case "iris": {
      const [a, b] = edge(q, spec.feather);
      return {
        maskImage:
          "radial-gradient(circle farthest-corner at " + f2(spec.x) + "% " + f2(spec.y) + "%, #000 " + f2(a) + "%, transparent " + f2(b) + "%)",
      };
    }
    case "strips": {
      const n = Math.max(1, spec.n);
      const s = Math.max(0, spec.stagger);
      const win = Math.max(0.05, 1 - (n - 1) * s);
      const ease = cached(spec.ease);
      const h = Array.from({ length: n }, (_, i) => 100 * ease(Math.min(1, Math.max(0, (q - i * s) / win))));
      const w = 100 / n;
      const pts: Array<[number, number]> = [];
      // Columns (up/down) or rows (left/right), one shared baseline: a single simple polygon.
      if (spec.dir === "up" || spec.dir === "down") {
        const y = (v: number) => (spec.dir === "up" ? 100 - v : v);
        const base = spec.dir === "up" ? 100 : 0;
        pts.push([0, base]);
        h.forEach((v, i) => pts.push([i * w, y(v)], [(i + 1) * w, y(v)]));
        pts.push([100, base]);
      } else {
        const x = (v: number) => (spec.dir === "right" ? v : 100 - v);
        const base = spec.dir === "right" ? 0 : 100;
        pts.push([base, 0]);
        h.forEach((v, i) => pts.push([x(v), i * w], [x(v), (i + 1) * w]));
        pts.push([base, 100]);
      }
      return { clipPath: "polygon(" + pts.map(([px, py]) => f2(px) + "% " + f2(py) + "%").join(", ") + ")" };
    }
  }
}
