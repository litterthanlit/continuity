import type { EaseSpec } from "./types.js";

export type EaseFn = (p: number) => number;

/**
 * Cubic bezier timing function, numerically identical in spirit to the
 * browser's (WebKit UnitBezier): Newton iterations with a bisection fallback.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFn {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-7) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 60; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-7) return t;
      if (x > v) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    return sampleY(solveX(p));
  };
}

export interface SpringParams {
  stiffness: number;
  damping: number;
  mass: number;
}

/** Position (0 → 1) of a damped spring released from rest at 0 towards 1, at time t seconds. */
export function springPosition({ stiffness, damping, mass }: SpringParams, t: number): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const env = Math.exp(-zeta * w0 * t);
    return 1 - env * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) {
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  // Overdamped: x(t) = 1 - (c1·e^{r1 t} + c2·e^{r2 t}) with x(0) = 0, x'(0) = 0.
  const s = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + s;
  const r2 = -zeta * w0 - s;
  const c1 = r2 / (r2 - r1);
  const c2 = r1 / (r1 - r2);
  return 1 - (c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
}

/** Seconds until the spring stays within `epsilon` of its target. */
export function springSettleTime(params: SpringParams, epsilon = 0.001): number {
  const dt = 1 / 600;
  let lastOutside = 0;
  for (let t = 0; t < 10; t += dt) {
    if (Math.abs(1 - springPosition(params, t)) > epsilon) lastOutside = t;
    else if (t - lastOutside > 0.25) break;
  }
  return Math.round((lastOutside + dt) * 1000) / 1000;
}

const springCache = new Map<string, number>();

function settleCached(params: SpringParams): number {
  const key = `${params.stiffness}|${params.damping}|${params.mass}`;
  let v = springCache.get(key);
  if (v === undefined) {
    v = springSettleTime(params);
    springCache.set(key, v);
  }
  return v;
}

/**
 * Natural duration for an ease: springs settle in their own time,
 * everything else has no opinion (returns null).
 */
export function naturalDuration(ease: EaseSpec): number | null {
  return ease.type === "spring" ? settleCached(ease) : null;
}

export function easeFn(ease: EaseSpec): EaseFn {
  switch (ease.type) {
    case "linear":
      return (p) => Math.min(1, Math.max(0, p));
    case "bezier":
      return cubicBezier(ease.p[0], ease.p[1], ease.p[2], ease.p[3]);
    case "steps": {
      const n = Math.max(1, Math.round(ease.n));
      return (p) => (p >= 1 ? 1 : p <= 0 ? 0 : Math.floor(p * n) / n);
    }
    case "spring": {
      const settle = settleCached(ease);
      // A spring tween maps progress 0..1 onto the spring's settle time, so a
      // tween can be shortened/lengthened while keeping the spring's character.
      return (p) => (p >= 1 ? 1 : p <= 0 ? 0 : springPosition(ease, p * settle));
    }
  }
}

/** True when the ease moves at constant speed (the classic "robotic motion" smell). */
export function isLinear(ease: EaseSpec): boolean {
  if (ease.type === "linear") return true;
  if (ease.type === "bezier") {
    const [x1, y1, x2, y2] = ease.p;
    return Math.abs(x1 - y1) < 0.05 && Math.abs(x2 - y2) < 0.05;
  }
  return false;
}
