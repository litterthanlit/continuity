/**
 * Continuity motion model: every animation is plain data.
 *
 * The same Timeline drives the in-browser runtime, the timeline linter, the
 * motion-path strips and the HyperFrames `*.motion.json` assertions, so what
 * the agent declares is exactly what gets rendered, measured and critiqued.
 */

export type EaseSpec =
  | { type: "linear" }
  | { type: "bezier"; p: [number, number, number, number] }
  | { type: "spring"; stiffness: number; damping: number; mass: number }
  | { type: "steps"; n: number };

/** Animatable channels. Units: px, %, deg, em or unitless as noted. */
export const PROPS = [
  "x", // px
  "y", // px
  "xPct", // % of own width
  "yPct", // % of own height
  "z", // px (needs perspective on an ancestor)
  "scale",
  "scaleX",
  "scaleY",
  "rotate", // deg
  "rotateX", // deg
  "rotateY", // deg
  "skewX", // deg
  "opacity", // 0..1
  "blur", // px
  "brightness", // 1 = identity
  "saturate", // 1 = identity
  "clipTop", // % inset
  "clipRight",
  "clipBottom",
  "clipLeft",
  "tracking", // letter-spacing, em
  "draw", // 0..1 svg stroke reveal (pathLength=1)
  "counter", // number rendered as text
] as const;
export type PropName = (typeof PROPS)[number];

export const SPATIAL_PROPS: ReadonlySet<PropName> = new Set<PropName>([
  "x",
  "y",
  "xPct",
  "yPct",
  "z",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "skewX",
]);

export const BASE_VALUES: Record<PropName, number> = {
  x: 0,
  y: 0,
  xPct: 0,
  yPct: 0,
  z: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  skewX: 0,
  opacity: 1,
  blur: 0,
  brightness: 1,
  saturate: 1,
  clipTop: 0,
  clipRight: 0,
  clipBottom: 0,
  clipLeft: 0,
  tracking: 0,
  draw: 1,
  counter: 0,
};

export type TweenKind =
  | "enter"
  | "exit"
  | "move"
  | "emphasis"
  | "camera"
  | "transition";

export type SplitMode = "chars" | "words" | "lines";

export type StaggerFrom = "start" | "end" | "center" | "edges";

export interface Stagger {
  /** Seconds between consecutive parts. */
  each: number;
  from: StaggerFrom;
  /** Token name, kept for lint/readability. */
  name?: string;
}

export interface CounterFormat {
  decimals: number;
  prefix?: string;
  suffix?: string;
  /** Thousands separator; "" for none. */
  separator?: string;
}

/** `from === null` means "inherit the current value" (previous tween's `to`, or the base value). */
export type PropRange = [number | null, number];

export interface Tween {
  /** Full element id: `<scene>.<element>` (matches `data-ct`). */
  target: string;
  kind: TweenKind;
  /** Scene-local seconds. */
  start: number;
  duration: number;
  ease: EaseSpec;
  /** Token name of the ease when one was used (e.g. "enter"). */
  easeName?: string;
  props: Partial<Record<PropName, PropRange>>;
  /** Animate split parts (chars/words/lines) of the target instead of the element itself. */
  split?: SplitMode;
  /** Wrap split parts in an overflow mask (for mask reveals). */
  mask?: boolean;
  stagger?: Stagger;
  preset?: string;
  counter?: CounterFormat;
  /** Lint rule ids this tween deliberately breaks. */
  allow?: string[];
  /** Tweens declared together (one call on several targets) share a group — choreographed as one unit. */
  group?: string;
}

/** Continuous, deterministic sine motion added on top of a channel (ambient life). */
export interface Loop {
  target: string;
  prop: PropName;
  amplitude: number;
  /** Seconds per cycle. */
  period: number;
  /** 0..1 fraction of a cycle. */
  phase: number;
  start: number;
  end: number | null;
}

export interface SceneTimeline {
  scene: string;
  /** Global start time (seconds) of the scene in the video. */
  start: number;
  duration: number;
  beats: Record<string, number>;
  tweens: Tween[];
  loops: Loop[];
}

export interface Timeline {
  version: 1;
  fps: number;
  width: number;
  height: number;
  duration: number;
  scenes: SceneTimeline[];
}

/** A concrete, per-element tween after split/stagger expansion. */
export interface ResolvedTween extends Omit<Tween, "split" | "stagger" | "props"> {
  /** Element id, or `<id>::<partIndex>` for split parts. */
  key: string;
  props: Partial<Record<PropName, [number, number]>>;
  /** Index of the source tween in the scene timeline. */
  source: number;
}

export type PartCounts = Record<string, Partial<Record<SplitMode, number>>>;
