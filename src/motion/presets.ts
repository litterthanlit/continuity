import { PRESS_SCALE, TRAVEL, type DurationToken, type EaseToken } from "./tokens.js";
import type { PropName, PropRange, TweenKind } from "./types.js";

/** One segment of a preset. Multi-segment presets (e.g. press) chain segments by `offset`. */
export interface PresetSegment {
  props: Partial<Record<PropName, PropRange>>;
  /**
   * A token or seconds. Spring eases take their own settle time unless the call
   * passes a duration; exits on the `exit` token derive 0.75× their entrance.
   */
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
  /** Travel distance in px for translate presets (default: litt's travel, 32). */
  distance?: number;
  /** Settled font channel values of the target (filled in by the builder from its type kit). */
  base?: Partial<Record<PropName, number>>;
  /** What the target's family can draw, per font channel (filled in by the builder). */
  range?: Partial<Record<PropName, [number, number]>>;
}

const d = (o: PresetOptions, fallback = TRAVEL) => o.distance ?? fallback;

/**
 * litt's vocabulary (docs/decisions/0006). Entrances are springs: responsive by
 * default, `settle` is the scene's one expressive moment. Exits ease out at
 * 0.75× their entrance and never bounce. Emphasis is ink, not size.
 */
export const enterPresets = {
  fade: {
    kind: "enter",
    description: "Opacity only. Quiet: secondary copy, a surface appearing in place.",
    segments: () => [{ props: { opacity: [0, 1] }, duration: "responsive", ease: "responsive" }],
  },
  rise: {
    kind: "enter",
    description: "Fade up by litt's travel (32px). The workhorse for copy, rows and cards.",
    segments: (o) => [{ props: { y: [d(o), 0], opacity: [0, 1] }, duration: "responsive", ease: "responsive" }],
  },
  slideLeft: {
    kind: "enter",
    description: "Slide in from the right by travel, moving left (reading direction).",
    segments: (o) => [{ props: { x: [d(o), 0], opacity: [0, 1] }, duration: "responsive", ease: "responsive" }],
  },
  slideRight: {
    kind: "enter",
    description: "Slide in from the left by travel, moving right.",
    segments: (o) => [{ props: { x: [-d(o), 0], opacity: [0, 1] }, duration: "responsive", ease: "responsive" }],
  },
  settle: {
    kind: "enter",
    description: "Placed, not thrown: rises by travel and settles from 0.98 on the expressive spring. The scene's one moment (a statement, the product).",
    segments: (o) => [
      { props: { y: [d(o), 0], scale: [PRESS_SCALE, 1], opacity: [0, 1] }, duration: "expressive", ease: "expressive" },
    ],
  },
  maskUp: {
    kind: "enter",
    mask: true,
    description: "Lines or words rise from behind their baseline. Use with split; pass ease \"expressive\" when it is the scene's moment.",
    segments: () => [{ props: { yPct: [110, 0] }, duration: "responsive", ease: "responsive" }],
  },
  grow: {
    kind: "enter",
    description: "Grow from the baseline (scaleY; bars, rails). Set transform-origin at the base — BarChart does.",
    segments: () => [{ props: { scaleY: [0, 1] }, duration: "responsive", ease: "responsive" }],
  },
  wipeRight: {
    kind: "enter",
    description: "Clip reveal left → right, for data: a chart behind its playhead, a timeline strip.",
    segments: () => [{ props: { clipRight: [100, 0] }, duration: "slow", ease: "inOut" }],
  },
  draw: {
    kind: "enter",
    description: "A stroke draws on (Path, LineChart's line). Data only.",
    segments: () => [{ props: { draw: [0, 1] }, duration: "slow", ease: "inOut" }],
  },
  typeOn: {
    kind: "enter",
    description: "Characters appear one by one (split: 'chars', or m.type). UI and terminal typing.",
    segments: () => [{ props: { opacity: [0, 1] }, duration: 0.001, ease: "linear" }],
  },
} satisfies Record<string, PresetDef>;

export const exitPresets = {
  fadeOut: {
    kind: "exit",
    description: "Opacity to zero, at 0.75× the entrance.",
    segments: () => [{ props: { opacity: [null, 0] }, duration: "exit", ease: "out" }],
  },
  liftOut: {
    kind: "exit",
    description: "Lift by half the travel and fade: clears the stage for what comes next.",
    segments: (o) => [{ props: { y: [null, -d(o, TRAVEL / 2)], opacity: [null, 0] }, duration: "exit", ease: "out" }],
  },
  dropOut: {
    kind: "exit",
    description: "Sink back by half the travel and fade (the reverse of rise).",
    segments: (o) => [{ props: { y: [null, d(o, TRAVEL / 2)], opacity: [null, 0] }, duration: "exit", ease: "out" }],
  },
  maskOut: {
    kind: "exit",
    mask: true,
    description: "Lines or words leave upward behind the mask.",
    segments: () => [{ props: { yPct: [null, -110] }, duration: "exit", ease: "out" }],
  },
  scaleOut: {
    kind: "exit",
    description: "Back to 0.98 and fade (the reverse of settle).",
    segments: () => [{ props: { scale: [null, PRESS_SCALE], opacity: [null, 0] }, duration: "exit", ease: "out" }],
  },
} satisfies Record<string, PresetDef>;

export const emphasisPresets = {
  ink: {
    kind: "emphasis",
    description: "Step up to fg from the grey, at the instant tier. litt ranks by ink: the word that matters brightens.",
    segments: () => [{ props: { ink: [0, 1] }, duration: "instant", ease: "out" }],
  },
  dim: {
    kind: "emphasis",
    description: "Step back to the grey from fg, at the instant tier, so something else leads.",
    segments: () => [{ props: { ink: [1, 0] }, duration: "instant", ease: "out" }],
  },
  press: {
    kind: "emphasis",
    description: "A button press: scale to 0.98 at the instant tier, back on the responsive spring.",
    segments: () => [
      { props: { scale: [null, PRESS_SCALE] }, duration: "instant", ease: "out" },
      { props: { scale: [null, 1] }, duration: "responsive", ease: "responsive", offset: 0.1 },
    ],
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
