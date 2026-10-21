import type { FxSpec } from "./types.js";

/**
 * Shape presentations for transitions (and any element): a pure function of
 * one progress channel `fx` (0 = hidden, 1 = fully revealed) and a static,
 * serialisable spec. Bundled into the runtime; deterministic per frame.
 *
 * - wipe: linear-gradient mask, feathered edge, any angle (CSS gradient angle: 90 = edge travels right)
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

export function fxStyle(spec: FxSpec, p: number): FxStyle {
  if (p >= 1) return { maskImage: "none" };
  const [a, b] = edge(Math.max(0, p), spec.feather);
  return { maskImage: "linear-gradient(" + f2(spec.angle) + "deg, #000 " + f2(a) + "%, transparent " + f2(b) + "%)" };
}
