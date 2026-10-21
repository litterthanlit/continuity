import type { EaseSpec, StaggerFrom } from "./types.js";

/**
 * Motion tokens — litt's three tiers, translated for video (docs/decisions/0006).
 *
 * Instant is a 100ms ease-out tween. Responsive and expressive are springs,
 * defined the way litt, Motion and Framer define them: a visual time plus a
 * bounce. Exits run at 0.75× the entrance's visual time, ease out, and never
 * bounce. `slow` and `linger` are video-only: the eye and the hand (a camera
 * focus move, a cursor leg, a chart drawing, a counter) — never an entrance.
 */
export const durations = {
  /** Ink steps, a press, a toggle, opacity on small UI. */
  instant: 0.1,
  /** Visual time of the responsive spring (it settles in ~0.35s). */
  responsive: 0.2,
  /** Visual time of the expressive spring (it settles in ~0.58s). One per scene. */
  expressive: 0.35,
  /** The expressive tier's exit (0.75 × 0.35). Exit presets derive their own from the entrance. */
  exit: 0.26,
  /** Video only: a camera focus move, a cursor leg, a chart drawing. */
  slow: 0.6,
  /** Video only: a counter, a long draw. */
  linger: 1.4,
} as const;
export type DurationToken = keyof typeof durations;

/** Exits run at this fraction of the entrance's visual time. */
export const EXIT_FACTOR = 0.75;
/** Ceilings litt holds every spring to. */
export const MAX_BOUNCE = 0.12;
export const MAX_VISUAL = 0.35;

/**
 * A spring from its visual time (seconds) and bounce (0 = critically damped),
 * converted the way Motion does: stiffness (2π / 1.2·visual)², damping
 * 2·(1 − bounce)·√stiffness, mass 1. The source values ride along for lint/docs.
 */
export function spring(visual: number, bounce = 0): Extract<EaseSpec, { type: "spring" }> {
  const root = (2 * Math.PI) / (visual * 1.2);
  const stiffness = round4(root * root);
  const damping = round4(2 * Math.min(1, Math.max(0.05, 1 - bounce)) * Math.sqrt(stiffness));
  return { type: "spring", stiffness, damping, mass: 1, visual, bounce };
}

/** Bounce of any spring: 1 − its damping ratio (0 for critically and over-damped). */
export function bounceOf(e: EaseSpec): number {
  if (e.type !== "spring") return 0;
  if (e.bounce !== undefined) return e.bounce;
  return Math.max(0, round4(1 - e.damping / (2 * Math.sqrt(e.stiffness * e.mass))));
}

/** Visual time of a spring (its own, or estimated from its natural frequency). */
export function visualOf(e: EaseSpec): number | undefined {
  if (e.type !== "spring") return undefined;
  if (e.visual !== undefined) return e.visual;
  return round4((2 * Math.PI) / Math.sqrt(e.stiffness / e.mass) / 1.2);
}

export const eases = {
  linear: { type: "linear" },
  /** litt's ease-out: the instant tier and every exit. */
  out: { type: "bezier", p: [0.25, 0.46, 0.45, 0.94] },
  /** Symmetric: the camera, a cursor leg, a playhead, scene transitions. */
  inOut: { type: "bezier", p: [0.65, 0, 0.35, 1] },
  /** Spring, visual 0.2s, bounce 0: copy, rows, chips, cascades — the default. */
  responsive: spring(durations.responsive, 0),
  /** Spring, visual 0.35s, bounce 0.12: the scene's one expressive moment. */
  expressive: spring(durations.expressive, MAX_BOUNCE),
} as const satisfies Record<string, EaseSpec>;
export type EaseToken = keyof typeof eases;

/** Seconds between consecutive parts in a group (litt's 40ms between siblings). */
export const staggers = {
  char: 0.02,
  word: 0.04,
  line: 0.08,
  list: 0.04,
  grid: 0.04,
} as const;
export type StaggerToken = keyof typeof staggers;

/** Entrance offset in px (litt's 16 at video scale); menus and tooltips use a quarter. */
export const TRAVEL = 32;
/** Press scale (litt's --press-scale). */
export const PRESS_SCALE = 0.98;
/** An ambient camera push stays within this much zoom over its scene. */
export const MAX_DRIFT = 0.03;

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
  if (typeof d === "number") return d;
  const v = durations[d];
  if (v === undefined) throw new Error(`Unknown duration token "${d}". Use one of: ${Object.keys(durations).join(", ")}`);
  return v;
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

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
