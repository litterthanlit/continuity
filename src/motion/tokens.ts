import type { EaseSpec, StaggerFrom } from "./types.js";

/**
 * Motion tokens — the taste layer.
 *
 * Durations follow Material 3 / Carbon ranges (UI motion lives in 120–900ms;
 * hero moments may stretch). Entrances decelerate, exits accelerate, moves
 * between two on-screen states use symmetric in-out curves.
 */
export const durations = {
  instant: 0.12,
  fast: 0.24,
  base: 0.4,
  slow: 0.64,
  hero: 0.9,
  linger: 1.4,
} as const;
export type DurationToken = keyof typeof durations;

export const eases = {
  linear: { type: "linear" },
  /** Default for moves between two resting states. */
  standard: { type: "bezier", p: [0.2, 0, 0, 1] },
  /** Emphasized decelerate — entrances. */
  enter: { type: "bezier", p: [0.05, 0.7, 0.1, 1] },
  /** Emphasized accelerate — exits. */
  exit: { type: "bezier", p: [0.3, 0, 0.8, 0.15] },
  /** Expo-out — hero reveals, big type. */
  hero: { type: "bezier", p: [0.16, 1, 0.3, 1] },
  /** Symmetric — camera moves, wipes, scene transitions. */
  inOut: { type: "bezier", p: [0.65, 0, 0.35, 1] },
  /** Quick, confident spring with almost no overshoot. */
  snappy: { type: "spring", stiffness: 380, damping: 34, mass: 1 },
  /** Soft settle. */
  gentle: { type: "spring", stiffness: 140, damping: 22, mass: 1 },
  /** Visible overshoot — use sparingly (playful brands, small elements). */
  bouncy: { type: "spring", stiffness: 300, damping: 15, mass: 1 },
} as const satisfies Record<string, EaseSpec>;
export type EaseToken = keyof typeof eases;

/** Seconds between consecutive parts in a group. */
export const staggers = {
  char: 0.018,
  word: 0.06,
  line: 0.09,
  list: 0.08,
  grid: 0.05,
} as const;
export type StaggerToken = keyof typeof staggers;

/**
 * Minimum on-screen hold for text to be read once (Netflix timed-text guidance:
 * ~17 chars/sec for adults, ≥ 5/6 s per event), plus a small settle buffer.
 */
export function readTime(chars: number): number {
  return Math.max(0.83, chars / 17 + 0.4);
}

/** Durations are allowed within this fraction of a token before lint calls them "off-token". */
export const TOKEN_TOLERANCE = 0.2;

export function resolveDuration(d: number | DurationToken): number {
  return typeof d === "number" ? d : durations[d];
}

export function resolveEase(e: EaseToken | EaseSpec): { spec: EaseSpec; name?: string } {
  if (typeof e === "string") {
    const spec = eases[e];
    if (!spec) throw new Error(`Unknown ease token "${e}". Use one of: ${Object.keys(eases).join(", ")}`);
    return { spec: spec as EaseSpec, name: e };
  }
  return { spec: e };
}

export function resolveStagger(
  s: StaggerToken | number | { each: number | StaggerToken; from?: StaggerFrom },
): { each: number; from: StaggerFrom; name?: string } {
  if (typeof s === "number") return { each: s, from: "start" };
  if (typeof s === "string") {
    const v = staggers[s];
    if (v === undefined) throw new Error(`Unknown stagger token "${s}". Use one of: ${Object.keys(staggers).join(", ")}`);
    return { each: v, from: "start", name: s };
  }
  const each = typeof s.each === "string" ? staggers[s.each] : s.each;
  return { each, from: s.from ?? "start", name: typeof s.each === "string" ? s.each : undefined };
}
