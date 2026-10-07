import type { DurationToken, EaseToken } from "./tokens.js";
import type { PropName, PropRange, TweenKind } from "./types.js";

/** One segment of a preset. Multi-segment presets (e.g. pulse) chain segments by `offset`. */
export interface PresetSegment {
  props: Partial<Record<PropName, PropRange>>;
  duration: DurationToken | number;
  ease: EaseToken;
  /** Seconds after the preset's start. */
  offset?: number;
}

export interface PresetDef {
  kind: TweenKind;
  description: string;
  /** Needs split parts wrapped in an overflow mask. */
  mask?: boolean;
  segments: (o: PresetOptions) => PresetSegment[];
}

export interface PresetOptions {
  /** Travel distance in px for translate presets. */
  distance?: number;
  /** Target letter-spacing (em) for tracking presets. */
  tracking?: number;
}

const d = (o: PresetOptions, fallback: number) => o.distance ?? fallback;

export const enterPresets = {
  fade: {
    kind: "enter",
    description: "Opacity only. Quiet, for secondary copy and backgrounds.",
    segments: () => [{ props: { opacity: [0, 1] }, duration: "base", ease: "standard" }],
  },
  rise: {
    kind: "enter",
    description: "Fade up from below. The workhorse entrance for copy and cards.",
    segments: (o) => [
      { props: { y: [d(o, 32), 0], opacity: [0, 1] }, duration: "slow", ease: "enter" },
    ],
  },
  drop: {
    kind: "enter",
    description: "Fade down from above.",
    segments: (o) => [
      { props: { y: [-d(o, 32), 0], opacity: [0, 1] }, duration: "slow", ease: "enter" },
    ],
  },
  slideLeft: {
    kind: "enter",
    description: "Slide in from the right, moving left.",
    segments: (o) => [
      { props: { x: [d(o, 64), 0], opacity: [0, 1] }, duration: "slow", ease: "enter" },
    ],
  },
  slideRight: {
    kind: "enter",
    description: "Slide in from the left, moving right.",
    segments: (o) => [
      { props: { x: [-d(o, 64), 0], opacity: [0, 1] }, duration: "slow", ease: "enter" },
    ],
  },
  fadeBlur: {
    kind: "enter",
    description: "Defocus → focus with a slight settle in scale. Premium, cinematic.",
    segments: () => [
      {
        props: { opacity: [0, 1], blur: [14, 0], scale: [1.04, 1] },
        duration: "slow",
        ease: "enter",
      },
    ],
  },
  scalePop: {
    kind: "enter",
    description: "Scale up with a snappy spring. Buttons, badges, icons, UI chips.",
    segments: () => [
      { props: { scale: [0.86, 1], opacity: [0, 1] }, duration: "slow", ease: "snappy" },
    ],
  },
  maskUp: {
    kind: "enter",
    mask: true,
    description: "Lines/words rise from behind an invisible baseline mask. Signature kinetic-type reveal.",
    segments: () => [{ props: { yPct: [110, 0] }, duration: "hero", ease: "hero" }],
  },
  maskDown: {
    kind: "enter",
    mask: true,
    description: "Drop in from behind a top mask.",
    segments: () => [{ props: { yPct: [-110, 0] }, duration: "hero", ease: "hero" }],
  },
  wipeRight: {
    kind: "enter",
    description: "Clip-path reveal left → right. Underlines, bars, images, panels.",
    segments: () => [{ props: { clipRight: [100, 0] }, duration: "slow", ease: "inOut" }],
  },
  wipeUp: {
    kind: "enter",
    description: "Clip-path reveal bottom → top.",
    segments: () => [{ props: { clipTop: [100, 0] }, duration: "slow", ease: "inOut" }],
  },
  trackIn: {
    kind: "enter",
    description: "Letter-spacing collapses from wide to the final tracking while fading in.",
    segments: (o) => [
      {
        props: { tracking: [0.4, o.tracking ?? -0.02], opacity: [0, 1] },
        duration: "hero",
        ease: "hero",
      },
    ],
  },
  typeOn: {
    kind: "enter",
    description: "Characters appear one by one (use with split: 'chars'). Terminal / code / UI typing.",
    segments: () => [{ props: { opacity: [0, 1] }, duration: 0.001, ease: "linear" }],
  },
  zoomIn: {
    kind: "enter",
    description: "Arrive from slightly larger and defocused. Big statements, logos.",
    segments: () => [
      {
        props: { scale: [1.18, 1], opacity: [0, 1], blur: [10, 0] },
        duration: "hero",
        ease: "hero",
      },
    ],
  },
  flipUp: {
    kind: "enter",
    description: "3D hinge up from the baseline (parent needs perspective; Stage provides it).",
    segments: () => [
      {
        props: { rotateX: [-80, 0], yPct: [30, 0], opacity: [0, 1] },
        duration: "slow",
        ease: "enter",
      },
    ],
  },
  draw: {
    kind: "enter",
    description: "Stroke draws on (SVG paths rendered with the Path kit component).",
    segments: () => [{ props: { draw: [0, 1] }, duration: "hero", ease: "inOut" }],
  },
} satisfies Record<string, PresetDef>;

export const exitPresets = {
  fadeOut: {
    kind: "exit",
    description: "Opacity to zero. Exits should be faster than entrances.",
    segments: () => [{ props: { opacity: [null, 0] }, duration: "fast", ease: "exit" }],
  },
  sinkOut: {
    kind: "exit",
    description: "Lift up and fade — clears the stage for what comes next.",
    segments: (o) => [
      { props: { y: [null, -d(o, 24)], opacity: [null, 0] }, duration: "base", ease: "exit" },
    ],
  },
  dropOut: {
    kind: "exit",
    description: "Fall away downward and fade.",
    segments: (o) => [
      { props: { y: [null, d(o, 24)], opacity: [null, 0] }, duration: "base", ease: "exit" },
    ],
  },
  blurOut: {
    kind: "exit",
    description: "Defocus and fade.",
    segments: () => [
      {
        props: { opacity: [null, 0], blur: [null, 12], scale: [null, 0.98] },
        duration: "base",
        ease: "exit",
      },
    ],
  },
  maskOut: {
    kind: "exit",
    mask: true,
    description: "Lines/words leave upward behind the mask.",
    segments: () => [{ props: { yPct: [null, -110] }, duration: "slow", ease: "exit" }],
  },
  wipeOut: {
    kind: "exit",
    description: "Clip-path hides left → right.",
    segments: () => [{ props: { clipLeft: [null, 100] }, duration: "base", ease: "inOut" }],
  },
  scaleOut: {
    kind: "exit",
    description: "Shrink slightly and fade.",
    segments: () => [
      { props: { scale: [null, 0.92], opacity: [null, 0] }, duration: "base", ease: "exit" },
    ],
  },
} satisfies Record<string, PresetDef>;

export const emphasisPresets = {
  pulse: {
    kind: "emphasis",
    description: "Scale up and settle back. Draw the eye to something already on screen.",
    segments: () => [
      { props: { scale: [null, 1.06] }, duration: "fast", ease: "standard" },
      { props: { scale: [null, 1] }, duration: "base", ease: "standard", offset: 0.24 },
    ],
  },
  glow: {
    kind: "emphasis",
    description: "Brighten and return.",
    segments: () => [
      { props: { brightness: [null, 1.5] }, duration: "fast", ease: "standard" },
      { props: { brightness: [null, 1] }, duration: "slow", ease: "standard", offset: 0.24 },
    ],
  },
  nudge: {
    kind: "emphasis",
    description: "Small upward hop.",
    segments: (o) => [
      { props: { y: [null, -d(o, 10)] }, duration: "fast", ease: "standard" },
      { props: { y: [null, 0] }, duration: "base", ease: "gentle", offset: 0.24 },
    ],
  },
  underline: {
    kind: "emphasis",
    description: "Grow a bar/underline element from the left (scaleX; set transform-origin: left).",
    segments: () => [{ props: { scaleX: [0, 1] }, duration: "slow", ease: "hero" }],
  },
} satisfies Record<string, PresetDef>;

export type EnterPreset = keyof typeof enterPresets;
export type ExitPreset = keyof typeof exitPresets;
export type EmphasisPreset = keyof typeof emphasisPresets;
export type PresetName = EnterPreset | ExitPreset | EmphasisPreset;

export const allPresets: Record<PresetName, PresetDef> = {
  ...enterPresets,
  ...exitPresets,
  ...emphasisPresets,
};
