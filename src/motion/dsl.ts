import { musicAt, nearest, onFrame, type SceneMusic } from "../audio/grid.js";
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
  EXIT_FACTOR,
  durations,
  eases,
  fitEase,
  CELL_RADIUS,
  dotScale,
  readTime,
  resolveDuration,
  resolveEase,
  resolveStagger,
  SETTLED_HOLD,
  staggers,
  type DurationToken,
  type EaseToken,
  type StaggerToken,
  visualOf,
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
 * - with music: `"beat:4"` the scene's 5th beat (0 = its first; `"beat:2.5"` between beats),
 *   `"bar:1"` its second bar, `"hit:0"` its first strong hit — offsets work: `"beat:4-0.05"`
 */
export type At = number | string;

/** Grid a start time snaps to (nearest point in the scene): beats, half beats, bars or hits. */
export type Snap = "beat" | "half" | "bar" | "hit";

export type StaggerSpec = StaggerToken | number | { each: number | StaggerToken; from?: StaggerFrom };

export interface TimingOptions {
  at?: At;
  duration?: number | DurationToken;
  ease?: EaseToken | EaseSpec;
  /** Lint rule ids this motion deliberately breaks (document why in a comment). */
  allow?: string[];
  /** Squash and stretch along the element's own motion, 0..0.5 (energetic register: objects with mass). */
  squash?: number;
  /** Move the start to the nearest beat, half beat, bar or hit of the music. */
  snap?: Snap;
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

/** m.retype: the pause between a cleared phrase and the next one's first key. */
const RETYPE_GAP = 0.1;
/** m.cycle: how far (% of its own height) a word travels to clear the slot's clip. */
const CYCLE_TRAVEL = 120;

export class MotionBuilder {
  readonly tweens: Tween[] = [];
  readonly loops: Loop[] = [];
  private calls = 0;

  constructor(
    readonly scene: string,
    readonly duration: number,
    readonly beats: Record<string, number>,
    /** Part counts estimated from the rendered view (so `after:` knows when a split cascade ends). */
    private readonly partsOf?: (target: string, mode: SplitMode) => number | undefined,
    /** Settled font channel values and ranges of a target, from its type kit (axis presets start from them). */
    private readonly basesOf?: (target: string) => { values: Partial<Record<PropName, number>>; ranges: Partial<Record<PropName, [number, number]>> } | undefined,
    /** Frame size in px (camera origins). */
    private readonly frame: { width: number; height: number } = { width: 1920, height: 1080 },
    /** The music on this scene's clock, when the storyboard has a soundtrack: `m.music.beats` etc. */
    readonly music?: SceneMusic,
    /** A rendered element's `data-ct-*` attributes (without the prefix): what a kit component says about its own parts. */
    private readonly dataOf?: (target: string) => Record<string, string> | undefined,
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
    const m = /^\s*([A-Za-z_][\w:.-]*?)\s*(?:([+-])\s*(\d*\.?\d+))?\s*$/.exec(at);
    if (!m) throw new MotionError(`[${this.scene}] Can't parse time "${at}". Use seconds, "b1", "b1+0.2", "end-0.5", "after:el" or "beat:4".`);
    const [, ref, sign, num] = m;
    const offset = num ? (sign === "-" ? -1 : 1) * Number(num) : 0;
    const onMusic = /^(beat|bar|hit):(\d*\.?\d+)$/.exec(ref);
    let base: number;
    if (ref === "end") base = this.duration;
    else if (ref === "start") base = 0;
    else if (ref.startsWith("after:")) base = this.endOf(ref.slice(6));
    else if (onMusic) base = this.onMusic(onMusic[1] as "beat" | "bar" | "hit", Number(onMusic[2]));
    else if (ref in this.beats) base = this.beats[ref];
    else
      throw new MotionError(
        `[${this.scene}] Unknown beat "${ref}". Beats in this scene: ${Object.keys(this.beats).join(", ") || "(none)"}`,
      );
    return round(base + offset);
  }

  /** Scene time of the scene's Nth beat, bar or hit (0 = the first at or after its start). */
  private onMusic(kind: "beat" | "bar" | "hit", n: number): number {
    const m = this.music;
    if (!m) throw new MotionError(`[${this.scene}] "${kind}:${n}" needs music — add "music" to the storyboard.`);
    if (kind === "hit" && !Number.isInteger(n)) throw new MotionError(`[${this.scene}] hits are counted in whole numbers ("hit:${Math.floor(n)}").`);
    const t = musicAt(m, kind === "beat" ? { beat: n } : kind === "bar" ? { bar: n } : { hit: n }, 0, 60 / m.bpm);
    if (t === undefined) throw new MotionError(`[${this.scene}] there is no hit ${n} in this scene (it has ${m.hits.length}).`);
    // The scene starts on a frame, so its frames are this clock's; the move starts on the beat's.
    return onFrame(t, m.fps);
  }

  /** A start time: `at`, moved to the nearest point of the music when `snap` asks. */
  private startOf(opts: { at?: At; snap?: Snap }): number {
    const t = this.time(opts.at);
    if (!opts.snap) return t;
    const m = this.music;
    if (!m) throw new MotionError(`[${this.scene}] snap: "${opts.snap}" needs music — add "music" to the storyboard.`);
    const points =
      opts.snap === "bar" ? m.bars : opts.snap === "hit" ? m.hits.map((h) => h.t) : opts.snap === "half" ? m.beats.flatMap((b, i) => (i + 1 < m.beats.length ? [b, (b + m.beats[i + 1]) / 2] : [b])) : m.beats;
    const p = nearest(points.filter((x) => x >= 0 && x <= this.duration), t);
    return p === undefined ? t : onFrame(p, m.fps);
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
    const { spec: token, name } = resolveEase(opts.ease ?? "responsive");
    const duration = opts.duration !== undefined ? resolveDuration(opts.duration) : (naturalDuration(token) ?? durations.responsive);
    const spec = fitEase(token, name, duration);
    const start = this.startOf(opts);
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
        squash: opts.squash,
      });
    });
    return this;
  }

  /**
   * Move the scene camera (a wrapper around the whole scene). Defaults to a slow push over the
   * rest of the scene. The camera scales about the frame centre; `origin` (px in the frame, e.g.
   * the left edge of a left-aligned statement) holds that point still instead, by adding the
   * translation (centre − origin) × (scale − 1) — so litt's push never drifts left-aligned type.
   */
  camera(props: Partial<Record<PropName, PropRange | number>>, opts: TimingOptions & { origin?: { x: number; y: number } } = {}): this {
    const start = this.startOf(opts);
    const { spec: token, name } = resolveEase(opts.ease ?? "inOut");
    const duration = opts.duration !== undefined ? resolveDuration(opts.duration) : round(this.duration - start);
    const spec = fitEase(token, name, duration);
    if (opts.origin && props.scale !== undefined) {
      const [s0, s1] = typeof props.scale === "number" ? [1, props.scale] : [props.scale[0] ?? 1, props.scale[1]];
      const shift = (axis: "x" | "y", centre: number, anchor: number) => {
        const user = props[axis];
        const [u0, u1] = user === undefined ? [0, 0] : typeof user === "number" ? [0, user] : [user[0] ?? 0, user[1]];
        props = { ...props, [axis]: [round(u0 + (centre - anchor) * (s0 - 1)), round(u1 + (centre - anchor) * (s1 - 1))] };
      };
      shift("x", this.frame.width / 2, opts.origin.x);
      shift("y", this.frame.height / 2, opts.origin.y);
    }
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

  /**
   * Continuous sine motion added on top of other motion. litt: motion that is
   * not a response never performs, so the lint warns on loops (`ambient-loop`)
   * — the camera's slow push is the ambient life. A caret blink is the exception.
   */
  loop(target: string, amplitudes: Partial<Record<PropName, number>>, opts: LoopOptions & { blink?: boolean }): this {
    const start = this.time(opts.at);
    const end = opts.until !== undefined ? this.time(opts.until) : null;
    for (const [prop, amplitude] of Object.entries(amplitudes) as [PropName, number][]) {
      this.loops.push({ target: this.id(target), prop, amplitude, period: opts.period, phase: opts.phase ?? 0, start, end, ...(opts.blink ? { blink: true } : {}) });
    }
    return this;
  }

  /**
   * Move an element (typically a Cursor) through waypoints, offsets in px from
   * its layout position. Each leg eases in-out; legs chain with a short hold
   * unless a waypoint has its own `at`.
   */
  path(
    target: string,
    points: Array<{ x: number; y: number; at?: At; duration?: number | DurationToken; hold?: number }>,
    opts: { at?: At; duration?: number | DurationToken; ease?: EaseToken | EaseSpec; hold?: number } = {},
  ): this {
    const { spec, name } = resolveEase(opts.ease ?? "inOut");
    let t = this.time(opts.at);
    for (const p of points) {
      const start = p.at !== undefined ? this.time(p.at) : t;
      const duration = resolveDuration(p.duration ?? opts.duration ?? "slow");
      this.push({
        target: this.id(target),
        kind: "move",
        start,
        duration,
        ease: fitEase(spec, name, duration),
        easeName: name,
        props: { x: [null, p.x], y: [null, p.y] },
      });
      t = round(start + duration + (p.hold ?? opts.hold ?? 0.12));
    }
    return this;
  }

  /**
   * A click: the pointer presses at the instant tier and springs back on the
   * responsive one, and a focus-coloured ring opens from its tip (`<target>-ripple`).
   */
  click(target: string, opts: { at?: At; snap?: Snap; ripple?: boolean } = {}): this {
    const at = this.startOf(opts);
    const id = this.id(target);
    const back = naturalDuration(eases.responsive) ?? durations.responsive;
    this.push({ target: id, kind: "emphasis", start: at, duration: durations.instant, ease: eases.out, easeName: "out", props: { scale: [null, 0.9] }, preset: "click" });
    this.push({ target: id, kind: "emphasis", start: round(at + durations.instant), duration: back, ease: eases.responsive, easeName: "responsive", props: { scale: [null, 1] }, preset: "click" });
    if (opts.ripple !== false) {
      this.push({
        target: `${id}-ripple`,
        kind: "emphasis",
        start: at,
        duration: durations.slow,
        ease: eases.out,
        easeName: "out",
        props: { scale: [0.4, 1.4], opacity: [0.8, 0] },
        preset: "click",
      });
    }
    return this;
  }

  /** Type text on, character by character, at a human rate (default 22 chars/s). */
  type(target: string, opts: { at?: At; cps?: number } = {}): this {
    return this.enter(target, "typeOn", { at: opts.at, split: "chars", stagger: round(1 / (opts.cps ?? 22)) });
  }

  /**
   * Type a phrase, hold it, delete it key by key and type the next, in one text element (the
   * ending after a fixed lead-in: "Your website is ▍ranking #1"). Each phrase holds long enough
   * to read (≈17 chars/s, the `retype-hold` lint) unless `hold` says otherwise; a phrase with its
   * own `at` starts typing then, and the one before it is deleted just in time. The last phrase
   * stays unless `clear`. With `caret`, that element blinks while a phrase holds and stays solid
   * while keys are pressed. Copy comes from the storyboard: `[text.e1, text.e2, …]`.
   */
  retype(
    target: string,
    phrases: Array<string | { text: string; at?: At; hold?: number }>,
    opts: { at?: At; snap?: Snap; cps?: number; deleteCps?: number; hold?: number; gap?: number; clear?: boolean; caret?: string; allow?: string[] } = {},
  ): this {
    if (!phrases.length) throw new MotionError(`[${this.scene}] m.retype("${target}") needs at least one phrase.`);
    const list = phrases.map((p) => (typeof p === "string" ? { text: p } : p));
    const tape = list.map((p) => p.text);
    const cps = opts.cps ?? 22;
    const deleteCps = opts.deleteCps ?? cps * 2.5;
    const id = this.id(target);
    const push = (from: number, n: number, start: number, duration: number) =>
      this.push({ target: id, kind: "emphasis", start, duration, ease: eases.linear, easeName: "linear", props: { typed: [from, from + n] }, preset: "retype", tape, allow: opts.allow });
    let key = 0;
    let free = this.startOf(opts);
    list.forEach((p, i) => {
      const n = [...p.text].length;
      const start = p.at !== undefined ? this.time(p.at) : free;
      if (start < free - 1e-6) throw new MotionError(`[${this.scene}] m.retype("${target}"): phrase ${i} ("${p.text}") starts at ${start}s, before the phrase before it is deleted (${round(free)}s).`);
      const typing = round(n / cps);
      push(key, n, start, typing);
      key += n;
      const typed = round(start + typing);
      const last = i === list.length - 1;
      if (last && !opts.clear) {
        if (opts.caret) this.blink(opts.caret, { at: typed });
        return;
      }
      const deleting = round(n / deleteCps);
      const next = last ? undefined : list[i + 1].at;
      const hold = p.hold ?? opts.hold ?? Math.ceil(Math.max(SETTLED_HOLD, readTime(n) - 0.7 * typing) * 100) / 100;
      const del = next !== undefined ? round(this.time(next) - (opts.gap ?? RETYPE_GAP) - deleting) : round(typed + hold);
      if (del < typed) throw new MotionError(`[${this.scene}] m.retype("${target}"): phrase ${i + 1} starts before "${p.text}" finishes typing — move its "at" later.`);
      if (opts.caret && del > typed) this.blink(opts.caret, { at: typed, until: del });
      push(key, n, del, deleting);
      key += n;
      free = round(del + deleting + (opts.gap ?? RETYPE_GAP));
    });
    return this;
  }

  /**
   * Flip a `<Cycle>` through its words in place: each step the word on show leaves upward behind
   * the slot's clip as the next rises into it. Steps fall every `every` seconds from `at`, or at
   * `times` (one per step: beats, `"beat:4"`…). The last word stays.
   */
  cycle(
    target: string,
    opts: { at?: At; every?: number; times?: At[]; snap?: Snap; ease?: EaseToken | EaseSpec; duration?: number | DurationToken; allow?: string[] } = {},
  ): this {
    const n = this.countOf(target, "Cycle");
    const first = this.startOf(opts);
    for (let k = 0; k < n - 1; k++) {
      const at = opts.times?.[k] !== undefined ? this.time(opts.times[k]) : round(first + k * (opts.every ?? 0.5));
      const group = `${this.scene}#${++this.calls}`;
      const step = { at, ease: opts.ease, duration: opts.duration, allow: opts.allow };
      this.flip(`${target}-${k}`, "exit", "cycle", { yPct: [0, -CYCLE_TRAVEL] }, step, group);
      this.flip(`${target}-${k + 1}`, "enter", "cycle", { yPct: [CYCLE_TRAVEL, 0] }, step, group);
    }
    return this;
  }

  /**
   * Notifications arrive in a `<NotificationStack>`, newest on top: the stack moves down one row as
   * one, and each new notification rides in from the row above, fading up, so the spacing never
   * changes and no card crosses another. Arrivals fall every `every` seconds from `at`, or at `times`.
   */
  stackIn(target: string, opts: { at?: At; every?: number; times?: At[]; snap?: Snap; ease?: EaseToken | EaseSpec; allow?: string[] } = {}): this {
    const n = this.countOf(target, "NotificationStack");
    const pitch = Number(this.dataOf?.(this.id(target))?.pitch);
    if (!(pitch > 0)) throw new MotionError(`[${this.scene}] m.stackIn("${target}") needs a <NotificationStack ct="${target}"> (it reads the row pitch from it).`);
    const first = this.startOf(opts);
    // Items lay out newest on top; while only arrivals 0…j are in, the whole stack sits n-1-j rows up.
    const rest = (j: number) => round((j - (n - 1)) * pitch);
    for (let j = 0; j < n; j++) {
      const at = opts.times?.[j] !== undefined ? this.time(opts.times[j]) : round(first + j * (opts.every ?? 0.5));
      const group = `${this.scene}#${++this.calls}`;
      const step = { at, ease: opts.ease };
      // The arrival travels one row, as far as every card below it moves: the stack's step, not a throw.
      this.flip(`${target}-${j}`, "enter", "stackIn", { y: [rest(j) - pitch, rest(j)], opacity: [0, 1] }, { ...step, allow: [...(opts.allow ?? []), "travel-too-far"] }, group);
      for (let i = 0; i < j; i++) this.flip(`${target}-${i}`, "move", "stackIn", { y: [null, rest(j)] }, { ...step, allow: opts.allow }, group);
    }
    return this;
  }

  /**
   * Fill a `<Ring>` and count its number with it: one start, one duration, one ease, so the arc
   * and the figure always agree. Fills from `from` (default 0) to the ring's own value.
   */
  ring(target: string, opts: { from?: number; to?: number; at?: At; snap?: Snap; duration?: number | DurationToken; ease?: EaseToken | EaseSpec; allow?: string[] } = {}): this {
    const data = this.dataOf?.(this.id(target));
    const max = Number(data?.max);
    if (!(max > 0)) throw new MotionError(`[${this.scene}] "${target}" is not a <Ring> in this scene's view.`);
    const from = opts.from ?? 0;
    const to = opts.to ?? Number(data!.value);
    const timing = { at: this.startOf(opts), duration: opts.duration ?? ("linger" as const), ease: opts.ease ?? ("out" as const), allow: opts.allow };
    this.tween(`${target}-arc`, { draw: [from / max, to / max] }, { ...timing, kind: "emphasis" });
    return this.counter(target, { ...timing, from, to, suffix: data!.suffix });
  }

  /**
   * A `<DotGrid>` on a wave: `"fill"` brings the cells in (from 40% size, fading up), `"dots"`
   * turns the squares into circles sized by their values. The wave crosses the grid in `span`
   * seconds (default 0.8), column by column (`wave: "left"`) or corner to corner (`"diagonal"`).
   */
  grid(
    target: string,
    mode: "fill" | "dots",
    opts: { at?: At; snap?: Snap; span?: number; wave?: "left" | "diagonal"; ease?: EaseToken | EaseSpec; duration?: number | DurationToken; allow?: string[] } = {},
  ): this {
    const n = this.countOf(target, "DotGrid");
    const rows = Number(this.dataOf!(this.id(target))!.rows) || 1;
    const cols = Math.ceil(n / rows);
    const at = this.startOf(opts);
    const span = opts.span ?? 0.8;
    const steps = opts.wave === "diagonal" ? cols - 1 + rows - 1 : cols - 1;
    const group = `${this.scene}#${++this.calls}`;
    for (let i = 0; i < n; i++) {
      const c = Math.floor(i / rows);
      const step = opts.wave === "diagonal" ? c + (i % rows) : c;
      const cell = `${target}-${i}`;
      const start = round(at + (steps ? (span * step) / steps : 0));
      const props: Partial<Record<PropName, PropRange>> =
        mode === "fill" ? { scale: [0.4, 1], opacity: [0, 1] } : { radius: [CELL_RADIUS, 50], scale: [1, dotScale(Number(this.dataOf!(this.id(cell))?.v) || 0)] };
      this.flip(cell, mode === "fill" ? "enter" : "move", "grid", props, { at: start, ease: opts.ease, duration: opts.duration, allow: opts.allow }, group);
    }
    return this;
  }

  /**
   * The pull-back reveal: the scene opens with a device's screen filling the frame (so a flat
   * scene before it can cut straight into its content), then the camera flies back until the
   * whole Window, Browser or Phone is in view. Put the device in the centre of the frame (Center
   * or a centred Safe). One fast move on the steep ease: it is the scene's reveal, so it may
   * outrun the camera's speed limit (`camera-too-fast` is allowed for it). Push in again later
   * with m.camera.
   */
  pullBack(device: string, opts: { at?: At; snap?: Snap; duration?: number | DurationToken; ease?: EaseToken | EaseSpec; allow?: string[] } = {}): this {
    const screen = this.dataOf?.(this.id(device))?.screen?.split(" ").map(Number);
    if (!screen || screen.length !== 4 || !(screen[2] > 0 && screen[3] > 0)) throw new MotionError(`[${this.scene}] m.pullBack("${device}") needs a <Window>, <Browser> or <Phone ct="${device}"> (it reads where the screen sits).`);
    const [dx, dy, w, h] = screen;
    // Cover: the screen fills the frame on both axes, its centre on the frame's centre.
    const s = Math.round(Math.max(this.frame.width / w, this.frame.height / h) * 10000) / 10000;
    return this.camera(
      { scale: [s, 1], x: [round(-s * dx), 0], y: [round(-s * dy), 0] },
      { at: opts.at, snap: opts.snap, duration: opts.duration ?? "slow", ease: opts.ease ?? "steep", allow: [...(opts.allow ?? []), "camera-too-fast"] },
    );
  }

  /** How many parts a kit component rendered (its `data-ct-count`). */
  private countOf(target: string, component: string): number {
    const n = Number(this.dataOf?.(this.id(target))?.count);
    if (!(n >= 1)) throw new MotionError(`[${this.scene}] "${target}" is not a <${component}> in this scene's view.`);
    return n;
  }

  private flip(target: string, kind: TweenKind, preset: string, props: Partial<Record<PropName, PropRange>>, o: { at: number; ease?: EaseToken | EaseSpec; duration?: number | DurationToken; allow?: string[] }, group: string) {
    const { spec: token, name } = resolveEase(o.ease ?? "responsive");
    const duration = o.duration !== undefined ? resolveDuration(o.duration) : (naturalDuration(token) ?? durations.responsive);
    this.push({ target: this.id(target), group, kind, start: o.at, duration, ease: fitEase(token, name, duration), easeName: name, props, preset, allow: o.allow });
  }

  /** Caret blink (soft, deterministic) between `at` and `until` — the one loop litt allows. */
  blink(target: string, opts: { at?: At; until?: At; period?: number } = {}): this {
    return this.loop(target, { opacity: 1.6 }, { period: opts.period ?? 1.0, phase: 0.25, at: opts.at, until: opts.until, blink: true });
  }

  /** Count a number up/down inside a text element. */
  counter(target: string, opts: CounterOptions): this {
    const { spec, name } = resolveEase(opts.ease ?? "out");
    const duration = resolveDuration(opts.duration ?? "linger");
    this.push({
      target: this.id(target),
      kind: "emphasis",
      start: this.startOf(opts),
      duration,
      ease: fitEase(spec, name, duration),
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
    const start = this.startOf(opts);
    const offsets = this.targetOffsets(list.length, opts);
    const mask = opts.mask ?? (def.mask && opts.split ? true : undefined);
    const group = list.length > 1 ? `${this.scene}#${++this.calls}` : undefined;
    list.forEach((el, i) => {
      const fb = this.basesOf?.(this.id(el));
      const segments = def.segments({ ...opts, base: fb?.values, range: fb?.ranges });
      for (const seg of segments) {
        const { spec: token, name } = resolveEase(seg.fixed ? seg.ease : (opts.ease ?? seg.ease));
        const segDuration =
          opts.duration !== undefined && !seg.fixed
            ? resolveDuration(opts.duration)
            : token.type === "spring"
              ? (naturalDuration(token) ?? resolveDuration(seg.duration))
              : def.kind === "exit" && seg.duration === "exit"
                ? this.exitDuration(this.id(el))
                : resolveDuration(seg.duration);
        this.push({
          target: this.id(el),
          group,
          kind: def.kind,
          start: round(start + offsets[i] + (seg.offset ?? 0)),
          duration: segDuration,
          ease: fitEase(token, name, segDuration),
          easeName: name,
          props: seg.props,
          preset: presetName,
          ...this.splitFields(opts.split, opts.stagger, mask),
          allow: opts.allow,
          squash: seg.fixed ? undefined : opts.squash,
        });
      }
    });
    return this;
  }

  /**
   * litt: an exit runs at 0.75× its entrance's visual time (the spring's, or
   * the tween's), within instant … the expressive exit. No entrance declared
   * yet: the expressive exit.
   */
  private exitDuration(target: string): number {
    // The entrance's visual time is its movement: not a zero-length cut-on, not a whip's blur bell.
    const blurOnly = (t: Tween) => Object.keys(t.props).every((p) => p === "blur" || p === "blurX" || p === "blurY");
    const enter = [...this.tweens].reverse().find((t) => t.target === target && t.kind === "enter" && t.duration > 0.01 && !blurOnly(t));
    if (!enter) return durations.exit;
    const visual = visualOf(enter.ease) ?? enter.duration;
    return round(Math.min(durations.exit, Math.max(durations.instant, EXIT_FACTOR * visual)));
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

  /** Extra time a split tween takes until its last part starts (estimated parts; unknown → assume 8). */
  private splitSpan(t: Tween): number {
    if (!t.split || !t.stagger) return 0;
    const n = this.partsOf?.(t.target, t.split) ?? 8;
    const offsets = staggerOffsets(Math.max(1, n), t.stagger.each, t.stagger.from);
    return Math.max(0, ...offsets);
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
