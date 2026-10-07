import { naturalDuration } from "./easing.js";
import {
  allPresets,
  type EmphasisPreset,
  type EnterPreset,
  type ExitPreset,
  type PresetName,
  type PresetOptions,
} from "./presets.js";
import {
  resolveDuration,
  resolveEase,
  resolveStagger,
  staggers,
  type DurationToken,
  type EaseToken,
  type StaggerToken,
} from "./tokens.js";
import type {
  CounterFormat,
  EaseSpec,
  Loop,
  PropName,
  PropRange,
  SplitMode,
  StaggerFrom,
  Tween,
  TweenKind,
} from "./types.js";

/**
 * When something happens, scene-local:
 * - `1.2` seconds
 * - `"b2"` a storyboard beat, `"b2+0.15"` / `"b2-0.1"` offsets from it
 * - `"end"` / `"end-0.6"` relative to the scene end
 * - `"after:headline"` / `"after:headline+0.1"` when the last tween on that element ends
 */
export type At = number | string;

export type StaggerSpec = StaggerToken | number | { each: number | StaggerToken; from?: StaggerFrom };

export interface TimingOptions {
  at?: At;
  duration?: number | DurationToken;
  ease?: EaseToken | EaseSpec;
  /** Lint rule ids this motion deliberately breaks (document why in a comment). */
  allow?: string[];
}

export interface PresetCallOptions extends TimingOptions, PresetOptions {
  /** Animate the target's characters, words or lines instead of the whole element. */
  split?: SplitMode;
  /** Gap between split parts, or between targets when several are passed. */
  stagger?: StaggerSpec;
  /** Force/disable the overflow mask around split parts. */
  mask?: boolean;
}

export interface TweenCallOptions extends TimingOptions {
  kind?: TweenKind;
  split?: SplitMode;
  stagger?: StaggerSpec;
  mask?: boolean;
}

export interface LoopOptions {
  period: number;
  phase?: number;
  at?: At;
  until?: At;
}

export interface CounterOptions extends TimingOptions, Partial<CounterFormat> {
  from?: number;
  to: number;
}

const DEFAULT_SPLIT_STAGGER: Record<SplitMode, StaggerToken> = {
  chars: "char",
  words: "word",
  lines: "line",
};

export class MotionError extends Error {}

export class MotionBuilder {
  readonly tweens: Tween[] = [];
  readonly loops: Loop[] = [];
  private calls = 0;

  constructor(
    readonly scene: string,
    readonly duration: number,
    readonly beats: Record<string, number>,
  ) {}

  /** Full `data-ct` id for a scene element. */
  id(el: string): string {
    if (el.includes(".")) return el;
    return `${this.scene}.${el}`;
  }

  /** Resolve an `At` to scene-local seconds. */
  time(at: At | undefined, fallback = 0): number {
    if (at === undefined) return fallback;
    if (typeof at === "number") return at;
    const m = /^\s*([A-Za-z_][\w:-]*?)\s*(?:([+-])\s*(\d*\.?\d+))?\s*$/.exec(at);
    if (!m) throw new MotionError(`[${this.scene}] Can't parse time "${at}". Use seconds, "b1", "b1+0.2", "end-0.5" or "after:el".`);
    const [, ref, sign, num] = m;
    const offset = num ? (sign === "-" ? -1 : 1) * Number(num) : 0;
    let base: number;
    if (ref === "end") base = this.duration;
    else if (ref === "start") base = 0;
    else if (ref.startsWith("after:")) base = this.endOf(ref.slice(6));
    else if (ref in this.beats) base = this.beats[ref];
    else
      throw new MotionError(
        `[${this.scene}] Unknown beat "${ref}". Beats in this scene: ${Object.keys(this.beats).join(", ") || "(none)"}`,
      );
    return round(base + offset);
  }

  /** End time of the last tween declared so far on an element. */
  endOf(el: string): number {
    const id = this.id(el);
    let end = -1;
    for (const t of this.tweens) {
      if (t.target === id) end = Math.max(end, t.start + t.duration + this.splitSpan(t));
    }
    if (end < 0) throw new MotionError(`[${this.scene}] "after:${el}" — no motion declared on "${el}" yet.`);
    return round(end);
  }

  enter(targets: string | string[], preset: EnterPreset, opts: PresetCallOptions = {}): this {
    return this.preset(targets, preset, opts);
  }

  exit(targets: string | string[], preset: ExitPreset, opts: PresetCallOptions = {}): this {
    return this.preset(targets, preset, opts);
  }

  emphasize(targets: string | string[], preset: EmphasisPreset, opts: PresetCallOptions = {}): this {
    return this.preset(targets, preset, opts);
  }

  /** Free-form tween. Prefer presets; use this for bespoke moves (with token eases/durations). */
  tween(targets: string | string[], props: Partial<Record<PropName, PropRange | number>>, opts: TweenCallOptions = {}): this {
    const list = toList(targets);
    const { spec, name } = resolveEase(opts.ease ?? "standard");
    const duration = opts.duration !== undefined ? resolveDuration(opts.duration) : (naturalDuration(spec) ?? 0.4);
    const start = this.time(opts.at);
    const normalized = normalizeProps(props);
    const offsets = this.targetOffsets(list.length, opts);
    const group = list.length > 1 ? `${this.scene}#${++this.calls}` : undefined;
    list.forEach((el, i) => {
      this.push({
        target: this.id(el),
        group,
        kind: opts.kind ?? "move",
        start: round(start + offsets[i]),
        duration,
        ease: spec,
        easeName: name,
        props: normalized,
        ...this.splitFields(opts.split, opts.stagger, opts.mask),
        allow: opts.allow,
      });
    });
    return this;
  }

  /** Move the scene camera (a wrapper around the whole scene). Defaults to a slow push over the rest of the scene. */
  camera(props: Partial<Record<PropName, PropRange | number>>, opts: TimingOptions = {}): this {
    const start = this.time(opts.at);
    const { spec, name } = resolveEase(opts.ease ?? "inOut");
    const duration = opts.duration !== undefined ? resolveDuration(opts.duration) : round(this.duration - start);
    this.push({
      target: `${this.scene}.camera`,
      kind: "camera",
      start,
      duration,
      ease: spec,
      easeName: name,
      props: normalizeProps(props),
      allow: opts.allow,
    });
    return this;
  }

  /** Ambient sine motion added on top of other motion (floating cards, breathing glows). */
  loop(target: string, amplitudes: Partial<Record<PropName, number>>, opts: LoopOptions): this {
    const start = this.time(opts.at);
    const end = opts.until !== undefined ? this.time(opts.until) : null;
    for (const [prop, amplitude] of Object.entries(amplitudes) as [PropName, number][]) {
      this.loops.push({ target: this.id(target), prop, amplitude, period: opts.period, phase: opts.phase ?? 0, start, end });
    }
    return this;
  }

  /** Count a number up/down inside a text element. */
  counter(target: string, opts: CounterOptions): this {
    const { spec, name } = resolveEase(opts.ease ?? "hero");
    this.push({
      target: this.id(target),
      kind: "emphasis",
      start: this.time(opts.at),
      duration: resolveDuration(opts.duration ?? "linger"),
      ease: spec,
      easeName: name,
      props: { counter: [opts.from ?? 0, opts.to] },
      counter: {
        decimals: opts.decimals ?? 0,
        prefix: opts.prefix,
        suffix: opts.suffix,
        separator: opts.separator ?? ",",
      },
      allow: opts.allow,
    });
    return this;
  }

  private preset(targets: string | string[], presetName: PresetName, opts: PresetCallOptions): this {
    const def = allPresets[presetName];
    if (!def) throw new MotionError(`[${this.scene}] Unknown preset "${presetName}".`);
    const list = toList(targets);
    const start = this.time(opts.at);
    const offsets = this.targetOffsets(list.length, opts);
    const segments = def.segments(opts);
    const mask = opts.mask ?? (def.mask && opts.split ? true : undefined);
    const group = list.length > 1 ? `${this.scene}#${++this.calls}` : undefined;
    list.forEach((el, i) => {
      for (const seg of segments) {
        const { spec, name } = resolveEase(opts.ease ?? seg.ease);
        const segDuration =
          opts.duration !== undefined
            ? resolveDuration(opts.duration)
            : spec.type === "spring" && opts.ease === undefined
              ? (naturalDuration(spec) ?? resolveDuration(seg.duration))
              : resolveDuration(seg.duration);
        this.push({
          target: this.id(el),
          group,
          kind: def.kind,
          start: round(start + offsets[i] + (seg.offset ?? 0)),
          duration: segDuration,
          ease: spec,
          easeName: name,
          props: seg.props,
          preset: presetName,
          ...this.splitFields(opts.split, opts.stagger, mask),
          allow: opts.allow,
        });
      }
    });
    return this;
  }

  /** Offsets when several targets share one call: staggered unless the stagger is used for split parts. */
  private targetOffsets(n: number, opts: { split?: SplitMode; stagger?: StaggerSpec }): number[] {
    if (n <= 1) return [0];
    if (opts.split) return new Array(n).fill(0);
    const s = resolveStagger(opts.stagger ?? "list");
    return staggerOffsets(n, s.each, s.from);
  }

  private splitFields(split: SplitMode | undefined, stagger: StaggerSpec | undefined, mask: boolean | undefined) {
    if (!split) return {};
    const s = resolveStagger(stagger ?? DEFAULT_SPLIT_STAGGER[split]);
    return { split, stagger: { each: s.each, from: s.from, name: s.name }, ...(mask ? { mask: true } : {}) };
  }

  /** Rough extra time a split tween takes for its last part (unknown part count → assume 8). */
  private splitSpan(t: Tween): number {
    if (!t.split || !t.stagger) return 0;
    return t.stagger.each * 7;
  }

  private push(t: Tween) {
    if (t.start < 0) throw new MotionError(`[${this.scene}] ${t.target} starts before the scene (${t.start}s).`);
    if (!(t.duration >= 0)) throw new MotionError(`[${this.scene}] ${t.target} has an invalid duration.`);
    const clean = Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined)) as unknown as Tween;
    this.tweens.push(clean);
  }
}

/** Per-index delays for a stagger, in seconds. */
export function staggerOffsets(n: number, each: number, from: StaggerFrom): number[] {
  const mid = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => {
    switch (from) {
      case "start":
        return i * each;
      case "end":
        return (n - 1 - i) * each;
      case "center":
        return Math.abs(i - mid) * each;
      case "edges":
        return (mid - Math.abs(i - mid)) * each;
    }
  }).map(round);
}

function toList(targets: string | string[]): string[] {
  return Array.isArray(targets) ? targets : [targets];
}

function normalizeProps(props: Partial<Record<PropName, PropRange | number>>): Partial<Record<PropName, PropRange>> {
  const out: Partial<Record<PropName, PropRange>> = {};
  for (const [k, v] of Object.entries(props) as [PropName, PropRange | number][]) {
    out[k] = typeof v === "number" ? [null, v] : v;
  }
  return out;
}

export function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export { staggers };
