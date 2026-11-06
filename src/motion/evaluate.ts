import { staggerOffsets, round } from "./dsl.js";
import { easeFn, type EaseFn } from "./easing.js";
import { fxStyle } from "./fx.js";
import {
  BASE_VALUES,
  VARIATION_AXES,
  type CounterFormat,
  type FxSpec,
  type Loop,
  type PartCounts,
  type PropName,
  type ResolvedTween,
  type SceneTimeline,
  type SplitMode,
} from "./types.js";

/**
 * Expand split/stagger tweens into concrete per-part tweens and resolve
 * inherited `from` values. Pure: identical inputs → identical outputs, which is
 * what makes the render seek-safe and the timeline lintable.
 */
export function resolveScene(scene: SceneTimeline, parts: PartCounts): ResolvedTween[] {
  const out: ResolvedTween[] = [];
  scene.tweens.forEach((tw, source) => {
    const base = {
      target: tw.target,
      kind: tw.kind,
      duration: tw.duration,
      ease: tw.ease,
      easeName: tw.easeName,
      preset: tw.preset,
      counter: tw.counter,
      tape: tw.tape,
      paint: tw.paint,
      fx: tw.fx,
      allow: tw.allow,
      mask: tw.mask,
      squash: tw.squash,
      source,
    };
    if (tw.split) {
      const n = Math.max(1, parts[tw.target]?.[tw.split] ?? 1);
      const offsets = staggerOffsets(n, tw.stagger?.each ?? 0, tw.stagger?.from ?? "start");
      for (let i = 0; i < n; i++) {
        out.push({ ...base, key: `${tw.target}::${i}`, start: round(tw.start + offsets[i]), props: tw.props as ResolvedTween["props"] });
      }
    } else {
      out.push({ ...base, key: tw.target, start: tw.start, props: tw.props as ResolvedTween["props"] });
    }
  });

  // Resolve `from: null` → value the channel holds at the tween's start.
  const byChannel = new Map<string, ResolvedTween[]>();
  for (const rt of out) {
    for (const prop of Object.keys(rt.props) as PropName[]) {
      const k = `${rt.key}|${prop}`;
      let list = byChannel.get(k);
      if (!list) byChannel.set(k, (list = []));
      list.push(rt);
    }
  }
  const resolvedProps = new Map<ResolvedTween, ResolvedTween["props"]>();
  for (const [k, list] of byChannel) {
    const prop = k.slice(k.lastIndexOf("|") + 1) as PropName;
    list.sort((a, b) => a.start - b.start || a.source - b.source);
    let prev: number = baseValue(scene.bases, list[0].target, prop);
    for (const rt of list) {
      const [from, to] = rt.props[prop] as unknown as [number | null, number];
      const f = from ?? prev;
      let rp = resolvedProps.get(rt);
      if (!rp) resolvedProps.set(rt, (rp = {}));
      rp[prop] = [f, to];
      prev = to;
    }
  }
  return out.map((rt) => ({ ...rt, props: resolvedProps.get(rt) ?? {} }));
}

/** Settled value of a channel: the element's font base (kit role) or the neutral value. */
function baseValue(bases: SceneTimeline["bases"], target: string, prop: PropName): number {
  return bases?.[target]?.[prop] ?? BASE_VALUES[prop];
}

interface Segment {
  start: number;
  end: number;
  from: number;
  to: number;
  ease: EaseFn;
}

export interface CompiledScene {
  scene: string;
  duration: number;
  /** key → prop → segments sorted by start */
  channels: Map<string, Map<PropName, Segment[]>>;
  loops: Map<string, Loop[]>;
  counters: Map<string, CounterFormat>;
  tapes: Map<string, string[]>;
  paints: Map<string, [string, string]>;
  fx: Map<string, FxSpec>;
  /** key → squash-and-stretch amount (the largest any of its tweens asks for). */
  squash: Map<string, number>;
  /** Frames per second: what one frame of shutter blur is measured against. */
  fps: number;
  /** Keys that move fast enough to need the shutter's motion blur (sampleScene derives it per frame). */
  shutter: Set<string>;
  resolved: ResolvedTween[];
  bases: SceneTimeline["bases"];
}

const easeCache = new Map<string, EaseFn>();
function cachedEase(rt: ResolvedTween): EaseFn {
  const k = JSON.stringify(rt.ease);
  let f = easeCache.get(k);
  if (!f) easeCache.set(k, (f = easeFn(rt.ease)));
  return f;
}

/** Motion blur per px/frame of travel: a 180° shutter (as push transitions use, easing.sigmaFor). */
export const SHUTTER = 0.144;
/** A move gets the shutter's blur when it would peak at this σ (px) or more; below it the blur is unseen. */
const SHUTTER_MIN = 1.5;
/** Layers the build owns: the scene root, its camera and transition layers keep their own blur. */
const OWN_LAYER_KEY = /\.(scene|camera|reveal|fx)$/;

export function compileScene(scene: SceneTimeline, parts: PartCounts, fps = 30): CompiledScene {
  const resolved = resolveScene(scene, parts);
  const channels = new Map<string, Map<PropName, Segment[]>>();
  const counters = new Map<string, CounterFormat>();
  const tapes = new Map<string, string[]>();
  const paints = new Map<string, [string, string]>();
  const fx = new Map<string, FxSpec>();
  const squash = new Map<string, number>();
  for (const rt of resolved) {
    let byProp = channels.get(rt.key);
    if (!byProp) channels.set(rt.key, (byProp = new Map()));
    for (const [prop, range] of Object.entries(rt.props) as [PropName, [number, number]][]) {
      let segs = byProp.get(prop);
      if (!segs) byProp.set(prop, (segs = []));
      segs.push({ start: rt.start, end: rt.start + rt.duration, from: range[0], to: range[1], ease: cachedEase(rt) });
    }
    if (rt.counter) counters.set(rt.key, rt.counter);
    if (rt.tape) tapes.set(rt.key, rt.tape);
    if (rt.paint) paints.set(rt.key, rt.paint);
    if (rt.fx) fx.set(rt.key, rt.fx);
    if (rt.squash) squash.set(rt.key, Math.max(squash.get(rt.key) ?? 0, Math.min(0.5, rt.squash)));
  }
  for (const byProp of channels.values()) for (const segs of byProp.values()) segs.sort((a, b) => a.start - b.start);
  const loops = new Map<string, Loop[]>();
  for (const l of scene.loops) {
    let list = loops.get(l.target);
    if (!list) loops.set(l.target, (list = []));
    list.push(l);
    if (!channels.has(l.target)) channels.set(l.target, new Map());
  }
  // Fast movers: the fastest any x/y segment travels, in px per frame, at its ease's steepest.
  const shutter = new Set<string>();
  for (const [key, byProp] of channels) {
    if (OWN_LAYER_KEY.test(key) || byProp.has("blurX") || byProp.has("blurY")) continue;
    let peak = 0;
    for (const prop of ["x", "y", "shiftX", "shiftY"] as const) {
      for (const seg of byProp.get(prop) ?? []) {
        const dur = seg.end - seg.start;
        if (!(dur > 0) || seg.from === seg.to) continue;
        let slope = 0;
        for (let i = 0; i < 40; i++) slope = Math.max(slope, Math.abs(seg.ease((i + 1) / 40) - seg.ease(i / 40)) * 40);
        peak = Math.max(peak, (Math.abs(seg.to - seg.from) * slope) / (dur * fps));
      }
    }
    if (SHUTTER * peak >= SHUTTER_MIN) shutter.add(key);
  }
  return { scene: scene.scene, duration: scene.duration, channels, loops, counters, tapes, paints, fx, squash, fps, shutter, resolved, bases: scene.bases };
}

export type Values = Partial<Record<PropName, number>> & {
  /** Squash-and-stretch deformation, a 2×2 matrix [a, b, c, d] applied in the parent's frame. */
  deform?: [number, number, number, number];
};

/** Speed (px/s) at which a stretch is ~76% of its amount, and acceleration (px/s²) for the squash. */
const STRETCH_SPEED = 2400;
const SQUASH_ACCEL = 60000;
/** Finite-difference step for velocity and acceleration: 1/240 s, well inside a frame. */
const H = 1 / 240;

/**
 * Squash and stretch from the motion itself: stretch by 1 + k·tanh(|v|/V) along the velocity,
 * squash by 1 + k·tanh(|a|/A) against the acceleration. Each factor keeps the area (s, 1/s), so
 * the element never grows; at rest both are the identity.
 */
export function deformation(xy: (t: number) => [number, number], t: number, k: number): [number, number, number, number] {
  const [x0, y0] = xy(t - H);
  const [x1, y1] = xy(t);
  const [x2, y2] = xy(t + H);
  const vx = (x2 - x0) / (2 * H);
  const vy = (y2 - y0) / (2 * H);
  const ax = (x2 - 2 * x1 + x0) / (H * H);
  const ay = (y2 - 2 * y1 + y0) / (H * H);
  const stretch = along(vx, vy, 1 + k * Math.tanh(Math.hypot(vx, vy) / STRETCH_SPEED));
  const squash = along(ax, ay, 1 / (1 + k * Math.tanh(Math.hypot(ax, ay) / SQUASH_ACCEL)));
  return mul(stretch, squash);
}

/** Scale by `s` along direction (dx, dy) and 1/s across it; identity without a direction. */
function along(dx: number, dy: number, s: number): [number, number, number, number] {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6 || Math.abs(s - 1) < 1e-6) return [1, 0, 0, 1];
  const c = dx / len;
  const n = dy / len;
  const q = 1 / s;
  // R · diag(s, 1/s) · Rᵀ
  return [c * c * s + n * n * q, c * n * (s - q), c * n * (s - q), n * n * s + c * c * q];
}

function mul(m: [number, number, number, number], o: [number, number, number, number]): [number, number, number, number] {
  return [m[0] * o[0] + m[1] * o[2], m[0] * o[1] + m[1] * o[3], m[2] * o[0] + m[3] * o[2], m[2] * o[1] + m[3] * o[3]];
}

function channelValue(segs: Segment[], t: number): number {
  const first = segs[0];
  if (t < first.start) return first.from;
  let active = first;
  for (const s of segs) {
    if (s.start <= t) active = s;
    else break;
  }
  if (t >= active.end) return active.to;
  const span = active.end - active.start;
  const p = span <= 0 ? 1 : (t - active.start) / span;
  return active.from + (active.to - active.from) * active.ease(p);
}

/** The segment in force at `t` and its eased progress, while it runs. */
function running(segs: Segment[], t: number): { seg: Segment; e: number } | undefined {
  let active: Segment | undefined;
  for (const s of segs) {
    if (s.start <= t) active = s;
    else break;
  }
  if (!active || t >= active.end) return undefined;
  const span = active.end - active.start;
  return { seg: active, e: active.ease(span <= 0 ? 1 : (t - active.start) / span) };
}

/** Below this change in scale a move is not a zoom: its path stays as it is. */
const ZOOM_MIN = 0.05;

/**
 * A zoom (a scale change, with or without a pan, in one move) runs about its fixed point, the one
 * place the start and end framings agree, at a steady proportional rate: scale on a log curve,
 * every point on a straight line. Interpolating scale linearly instead crawls, then lunges (a
 * 15x zoom quadrupled its size in a frame). The ends are exactly the move's own values.
 */
function zoomPath(byProp: Map<PropName, Segment[]>, t: number, v: Values) {
  const scale = byProp.get("scale");
  const run = scale && running(scale, t);
  if (!run) return;
  const { seg, e } = run;
  if (!(seg.from > 0 && seg.to > 0) || Math.abs(Math.log(seg.to / seg.from)) < ZOOM_MIN) return;
  const r = seg.to / seg.from;
  const rho = Math.pow(r, e);
  v.scale = seg.from * rho;
  for (const axis of ["x", "y"] as const) {
    const pan = byProp.get(axis)?.find((p) => p.start === seg.start && p.end === seg.end);
    const t0 = pan ? pan.from : (v[axis] ?? 0);
    const t1 = pan ? pan.to : t0;
    // The fixed point, relative to the transform origin: where start and end framings coincide.
    const f = (t1 - r * t0) / (1 - r);
    if (pan || v[axis] !== undefined) v[axis] = f * (1 - rho) + rho * t0;
  }
}

/** Values of every animated channel at scene-local time `t`. */
export function sampleScene(c: CompiledScene, t: number): Map<string, Values> {
  const out = new Map<string, Values>();
  for (const [key, byProp] of c.channels) {
    const v: Values = {};
    for (const [prop, segs] of byProp) v[prop] = channelValue(segs, t);
    zoomPath(byProp, t, v);
    const loops = c.loops.get(key);
    if (loops) {
      for (const l of loops) {
        if (t < l.start || (l.end !== null && t > l.end)) continue;
        const base = v[l.prop] ?? baseValue(c.bases, key.split("::")[0], l.prop);
        v[l.prop] = base + l.amplitude * Math.sin(2 * Math.PI * ((t - l.start) / l.period + l.phase));
      }
    }
    // The shutter: a fast mover smears along its path, by its speed this frame (gone as it settles).
    if (c.shutter.has(key)) {
      const xs = byProp.get("x");
      const ys = byProp.get("y");
      const sxs = byProp.get("shiftX");
      const sys = byProp.get("shiftY");
      const speed = (segs: Segment[] | undefined) => (segs ? (channelValue(segs, t + H) - channelValue(segs, t - H)) / (2 * H) : 0);
      const bx = (SHUTTER * Math.abs(speed(xs) + speed(sxs))) / c.fps;
      const by = (SHUTTER * Math.abs(speed(ys) + speed(sys))) / c.fps;
      v.blurX = bx >= 0.5 ? bx : 0;
      v.blurY = by >= 0.5 ? by : 0;
    }
    const k = c.squash.get(key);
    if (k) {
      const xs = byProp.get("x");
      const ys = byProp.get("y");
      if (xs || ys) v.deform = deformation((u) => [xs ? channelValue(xs, u) : 0, ys ? channelValue(ys, u) : 0], t, k);
    }
    out.set(key, v);
  }
  return out;
}

const TRANSFORM_PROPS: PropName[] = ["x", "y", "shiftX", "shiftY", "xPct", "yPct", "z", "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY", "skewX"];
const FILTER_PROPS: PropName[] = ["blur", "brightness", "saturate"];
const CLIP_PROPS: PropName[] = ["clipTop", "clipRight", "clipBottom", "clipLeft"];

/**
 * `a` over `b` at weight `w` (0..1). The settled ends are the plain colours, not a 0%/100% mix: the
 * contrast audit reads `color` and skips any it cannot parse, and Chrome computes a color-mix as
 * `oklab(...)`, so a dimmed line would never be checked.
 */
function inkMix(a: string, w: number, b: string): string {
  const p = Math.round(Math.min(1, Math.max(0, w)) * 1000) / 10;
  if (p >= 100) return a;
  if (p <= 0) return b;
  return "color-mix(in oklab, " + a + " " + p + "%, " + b + ")";
}

export interface StyleOut {
  transform?: string;
  opacity?: string;
  filter?: string;
  clipPath?: string;
  letterSpacing?: string;
  /** The ink channel: a mix of the grey and fg. */
  color?: string;
  strokeDashoffset?: string;
  borderRadius?: string;
  /** The paint channel: a mix of Tween.paint's two colours. */
  backgroundColor?: string;
  text?: string;
  fontWeight?: string;
  fontStretch?: string;
  /** Animated variation axes only; the runtime merges them over the element's settled settings. */
  fontVariation?: Record<string, number>;
  maskImage?: string;
  /** Directional blur [x, y] in px (stdDeviation of the element's runtime SVG filter). */
  motionBlur?: [number, number];
}

/**
 * Merge animated axes over an element's settled `font-variation-settings`
 * (e.g. a kit's `"SOFT" 100, "WONK" 1`), so animating SOFT keeps WONK.
 */
export function mergeVariationSettings(base: string, animated: Record<string, number>): string {
  const axes = new Map<string, string>();
  if (base && base !== "normal") {
    for (const part of base.split(",")) {
      const m = /^\s*["']([A-Za-z0-9]{4})["']\s+(-?[\d.]+)\s*$/.exec(part);
      if (m) axes.set(m[1], m[2]);
    }
  }
  for (const [tag, v] of Object.entries(animated)) axes.set(tag, f4(v));
  return [...axes].map(([tag, v]) => `"${tag}" ${v}`).join(", ") || "normal";
}

const f4 = (n: number) => {
  const r = Math.round(n * 10000) / 10000;
  return Object.is(r, -0) ? "0" : String(r);
};

/**
 * The text a tape shows at keystroke `k`: each phrase is typed one key at a time, then deleted
 * one key at a time, before the next. Fractional keystrokes round down (a key is pressed or not).
 */
export function tapeText(tape: string[], k: number): string {
  let left = Math.floor(k + 1e-6);
  for (const phrase of tape) {
    const n = [...phrase].length;
    if (left <= n) return [...phrase].slice(0, left).join("");
    left -= n;
    if (left <= n) return [...phrase].slice(0, n - left).join("");
    left -= n;
  }
  return "";
}

export function formatCounter(value: number, fmt: CounterFormat): string {
  const fixed = value.toFixed(fmt.decimals);
  const [int, dec] = fixed.split(".");
  const sep = fmt.separator ?? ",";
  const neg = int.startsWith("-");
  const digits = neg ? int.slice(1) : int;
  const grouped = sep ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : digits;
  return (fmt.prefix ?? "") + (neg ? "-" : "") + grouped + (dec ? "." + dec : "") + (fmt.suffix ?? "");
}

/** Turn channel values into CSS. Only channels that are animated are emitted. */
export function styleOf(v: Values, counter?: CounterFormat, fx?: FxSpec, tape?: string[], paint?: [string, string]): StyleOut {
  const s: StyleOut = {};
  const has = (p: PropName) => v[p] !== undefined;
  const g = (p: PropName) => v[p] ?? BASE_VALUES[p];
  if (TRANSFORM_PROPS.some(has) || v.deform) {
    let tr = "translate3d(" + f4(g("x") + g("shiftX")) + "px," + f4(g("y") + g("shiftY")) + "px," + f4(g("z")) + "px)";
    // In the parent's frame, before the element's own rotation: it stretches along its path on screen.
    const m = v.deform;
    if (m && (Math.abs(m[0] - 1) > 1e-4 || Math.abs(m[1]) > 1e-4 || Math.abs(m[2]) > 1e-4 || Math.abs(m[3] - 1) > 1e-4)) {
      tr += " matrix(" + f4(m[0]) + "," + f4(m[2]) + "," + f4(m[1]) + "," + f4(m[3]) + ",0,0)";
    }
    if (has("xPct") || has("yPct")) tr += " translate(" + f4(g("xPct")) + "%," + f4(g("yPct")) + "%)";
    if (has("rotateX")) tr += " rotateX(" + f4(g("rotateX")) + "deg)";
    if (has("rotateY")) tr += " rotateY(" + f4(g("rotateY")) + "deg)";
    if (has("rotate")) tr += " rotate(" + f4(g("rotate")) + "deg)";
    const sx = g("scale") * g("scaleX");
    const sy = g("scale") * g("scaleY");
    if (sx !== 1 || sy !== 1 || has("scale") || has("scaleX") || has("scaleY")) tr += " scale(" + f4(sx) + "," + f4(sy) + ")";
    if (has("skewX")) tr += " skewX(" + f4(g("skewX")) + "deg)";
    s.transform = tr;
  }
  if (has("opacity")) s.opacity = f4(Math.min(1, Math.max(0, g("opacity"))));
  if (FILTER_PROPS.some(has)) {
    const parts: string[] = [];
    if (has("blur")) parts.push("blur(" + f4(Math.max(0, g("blur"))) + "px)");
    if (has("brightness")) parts.push("brightness(" + f4(g("brightness")) + ")");
    if (has("saturate")) parts.push("saturate(" + f4(g("saturate")) + ")");
    s.filter = parts.join(" ");
  }
  if (CLIP_PROPS.some(has) || has("clipRound")) {
    const insets = CLIP_PROPS.map((p) => Math.min(100, Math.max(0, g(p))));
    const round = Math.max(0, g("clipRound"));
    // Fully open is no clip: inset(0) would keep cutting ink that leaves the box (a descender under tight leading).
    s.clipPath =
      insets.every((v) => v === 0) && round < 0.01 ? "none" : "inset(" + insets.map((v) => f4(v) + "%").join(" ") + (round >= 0.01 ? " round " + f4(round) + "px" : "") + ")";
  }
  if (has("fx") && fx) {
    const shape = fxStyle(fx, g("fx"));
    if (shape.maskImage !== undefined) s.maskImage = shape.maskImage;
    if (shape.clipPath !== undefined) s.clipPath = shape.clipPath; // one clip shape per element: fx wins over insets
  }
  if (has("blurX") || has("blurY")) s.motionBlur = [Math.max(0, g("blurX")), Math.max(0, g("blurY"))];
  if (has("tracking")) s.letterSpacing = f4(g("tracking")) + "em";
  if (has("ink")) s.color = inkMix("var(--color-fg)", g("ink"), "var(--color-fg-muted)");
  if (has("accent")) s.color = inkMix("var(--color-accent-text)", g("accent"), s.color ?? "var(--color-fg)");
  if (has("radius")) s.borderRadius = f4(Math.min(50, Math.max(0, g("radius")))) + "%";
  if (has("corner")) s.borderRadius = f4(Math.max(0, g("corner"))) + "px";
  if (has("paint") && paint) {
    const p = Math.round(Math.min(1, Math.max(0, g("paint"))) * 1000) / 10;
    s.backgroundColor = p >= 100 ? paint[1] : p <= 0 ? paint[0] : "color-mix(in oklab, " + paint[1] + " " + p + "%, " + paint[0] + ")";
  }
  if (has("draw")) s.strokeDashoffset = f4(1 - Math.min(1, Math.max(0, g("draw"))));
  if (has("counter")) s.text = formatCounter(g("counter"), counter ?? { decimals: 0 });
  if (has("typed") && tape) s.text = tapeText(tape, g("typed"));
  if (has("wght")) s.fontWeight = f4(Math.min(1000, Math.max(1, g("wght"))));
  if (has("wdth")) s.fontStretch = f4(Math.min(200, Math.max(50, g("wdth")))) + "%";
  for (const [prop, tag] of Object.entries(VARIATION_AXES) as Array<[PropName, string]>) {
    if (has(prop)) (s.fontVariation ??= {})[tag] = g(prop);
  }
  return s;
}

/** Which split mode each element needs, from its tweens (one mode per element). */
export function splitModes(scene: SceneTimeline): Map<string, { mode: SplitMode; mask: boolean }> {
  const m = new Map<string, { mode: SplitMode; mask: boolean }>();
  for (const t of scene.tweens) {
    if (!t.split) continue;
    const prev = m.get(t.target);
    m.set(t.target, { mode: prev?.mode ?? t.split, mask: Boolean(prev?.mask || t.mask) });
  }
  return m;
}
