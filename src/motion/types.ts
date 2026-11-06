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
  /** `visual` / `bounce` record how a spring was defined (tokens.spring); the motion uses stiffness, damping and mass. */
  | { type: "spring"; stiffness: number; damping: number; mass: number; visual?: number; bounce?: number }
  | { type: "steps"; n: number }
  /**
   * Whip and drift: `share` of the travel lands in the first `snap` of the tween (a fraction of
   * its progress; the `whip` token keeps that at ~1.5 frames whatever the duration), and the rest
   * drifts in slowly over the remainder, so the element is still alive while it is read.
   */
  | { type: "whip"; snap: number; share: number }
  /** Leaves at rest, kicks off steeply, peaks at 1 a third of the way, and returns to 0: e(u) = 27/4·u·(1-u)². */
  | { type: "impulse" };

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
  "typed", // keystrokes along the tween's tape (Tween.tape): the element shows the text at that keystroke
  "wght", // font-weight (variable families)
  "wdth", // font-stretch, % (width-variable families)
  "opsz", // optical size axis
  "soft", // SOFT axis 0..100 (a brand family that has it)
  "ink", // 0..1: 0 is the grey (fg-muted), 1 is fg — litt ranks by ink, not size
  "fx", // 0..1 progress of the tween's shape presentation (Tween.fx): 0 hidden, 1 revealed
  "blurX", // px, directional (motion) blur along x
  "blurY", // px, directional (motion) blur along y
  "match", // 0..1 progress of a shared-element carrier (the morph transition) from its outgoing to its incoming place
  "morph", // shape of a <Morph>: 0 its first shape, 1 the second … (fractional = in between)
  "accent", // 0..1: live input in the accent's text tone (1) settling to the element's ink (0) — m.retype's accent
  "radius", // corner radius, % of the element's size: 0 square … 50 a circle (a cell becoming a dot)
  "clipRound", // px: corner radius of the clip insets (a rounded window — the portal transition)
  "shiftX", // px, additive to x: a handoff moves an element that is also running its own x tween
  "shiftY", // px, additive to y
  "paint", // 0..1: a fill mixed from Tween.paint[0] (0) to Tween.paint[1] (1)
  "corner", // px: border-radius
] as const;
export type PropName = (typeof PROPS)[number];

export const SPATIAL_PROPS: ReadonlySet<PropName> = new Set<PropName>([
  "x",
  "y",
  "shiftX",
  "shiftY",
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
  typed: 0,
  wght: 400,
  wdth: 100,
  opsz: 16,
  soft: 0,
  ink: 1,
  fx: 1,
  blurX: 0,
  blurY: 0,
  match: 1,
  morph: 0,
  radius: 0,
  accent: 0,
  clipRound: 0,
  shiftX: 0,
  shiftY: 0,
  paint: 1,
  corner: 0,
};

/** Channels that set font-variation-settings (wght/wdth go through font-weight/font-stretch). */
export const VARIATION_AXES: Partial<Record<PropName, string>> = { opsz: "opsz", soft: "SOFT" };

export type TweenKind =
  | "enter"
  | "exit"
  | "move"
  | "emphasis"
  | "camera"
  | "transition";

export type SplitMode = "chars" | "words" | "lines";

/** A shape presentation driven by the `fx` channel (src/motion/fx.ts). */
export type FxSpec =
  /** Feathered linear mask; `angle` is a CSS gradient angle (90 = the edge travels right). `feather` in % of the gradient line. */
  | { kind: "wipe"; angle: number; feather: number }
  /** Square cells revealed in an ordered dither that sweeps along `angle` (CSS angle). `cols` × `rows` cells cover the element (`rows` may be fractional: cells stay square). */
  | { kind: "pixels"; angle: number; cols: number; rows: number };

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
  /**
   * Phrases typed and deleted in turn (m.retype): keystroke k of the tape types phrase 0, then
   * deletes it, then types phrase 1… The `typed` channel says which keystroke the element shows.
   */
  tape?: string[];
  /** CSS colours [from, to] the `paint` channel mixes between (0 = from, 1 = to). */
  paint?: [string, string];
  /** Shape presentation the `fx` channel drives. */
  fx?: FxSpec;
  /**
   * Geometry the runtime measures once at prepare (layout is unknown to the build) and writes into
   * this tween's values, as the morph carriers do: `focus` zooms the camera until `target` fills
   * `fill` of the frame; `match` starts this element where `from` was at the outgoing scene's end,
   * `matchVelocity` carries `from`'s last-frame velocity through the cut on one axis (shiftX or
   * shiftY: the whole travel when `from` is moving, match.ts) and `matchShape` turns `from`'s fill and corner into this element's own;
   * `portal` maps this scene root onto `via`'s rect (the portal transition: `inner` is the scene
   * seen through the element, `outer` the scene that holds it; `at` is when `via` is measured, in
   * its own scene's seconds).
   */
  measure?:
    | { kind: "focus"; target: string; fill: number }
    | { kind: "match"; from: string }
    | { kind: "matchVelocity"; from: string; axis: "x" | "y" }
    | { kind: "matchShape"; from: string }
    | { kind: "portal"; via: string; at: number; role: "inner" | "outer"; dir: "in" | "out" };
  /** Lint rule ids this tween deliberately breaks. */
  allow?: string[];
  /** Tweens declared together (one call on several targets) share a group — choreographed as one unit. */
  group?: string;
  /**
   * Squash and stretch, 0..0.5: the element stretches along its velocity and squashes against
   * its acceleration (x/y channels), so a fast move reads as mass. Evaluated per frame from the
   * motion itself — a pure function of time.
   */
  squash?: number;
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
  /** A caret blink: the one loop litt allows (lint skips it). */
  blink?: boolean;
}

export interface SceneTimeline {
  scene: string;
  /** Global start time (seconds) of the scene in the video. */
  start: number;
  duration: number;
  beats: Record<string, number>;
  tweens: Tween[];
  loops: Loop[];
  /**
   * Settled values of font channels per element (from its type kit role and
   * classes): what `from: null` and loops start from, instead of BASE_VALUES.
   */
  bases?: Record<string, Partial<Record<PropName, number>>>;
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
