import { staggerOffsets, round } from "./dsl.js";
import { easeFn, type EaseFn } from "./easing.js";
import {
  BASE_VALUES,
  type CounterFormat,
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
      allow: tw.allow,
      mask: tw.mask,
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
    let prev: number = BASE_VALUES[prop];
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
  resolved: ResolvedTween[];
}

const easeCache = new Map<string, EaseFn>();
function cachedEase(rt: ResolvedTween): EaseFn {
  const k = JSON.stringify(rt.ease);
  let f = easeCache.get(k);
  if (!f) easeCache.set(k, (f = easeFn(rt.ease)));
  return f;
}

export function compileScene(scene: SceneTimeline, parts: PartCounts): CompiledScene {
  const resolved = resolveScene(scene, parts);
  const channels = new Map<string, Map<PropName, Segment[]>>();
  const counters = new Map<string, CounterFormat>();
  for (const rt of resolved) {
    let byProp = channels.get(rt.key);
    if (!byProp) channels.set(rt.key, (byProp = new Map()));
    for (const [prop, range] of Object.entries(rt.props) as [PropName, [number, number]][]) {
      let segs = byProp.get(prop);
      if (!segs) byProp.set(prop, (segs = []));
      segs.push({ start: rt.start, end: rt.start + rt.duration, from: range[0], to: range[1], ease: cachedEase(rt) });
    }
    if (rt.counter) counters.set(rt.key, rt.counter);
  }
  for (const byProp of channels.values()) for (const segs of byProp.values()) segs.sort((a, b) => a.start - b.start);
  const loops = new Map<string, Loop[]>();
  for (const l of scene.loops) {
    let list = loops.get(l.target);
    if (!list) loops.set(l.target, (list = []));
    list.push(l);
    if (!channels.has(l.target)) channels.set(l.target, new Map());
  }
  return { scene: scene.scene, duration: scene.duration, channels, loops, counters, resolved };
}

export type Values = Partial<Record<PropName, number>>;

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

/** Values of every animated channel at scene-local time `t`. */
export function sampleScene(c: CompiledScene, t: number): Map<string, Values> {
  const out = new Map<string, Values>();
  for (const [key, byProp] of c.channels) {
    const v: Values = {};
    for (const [prop, segs] of byProp) v[prop] = channelValue(segs, t);
    const loops = c.loops.get(key);
    if (loops) {
      for (const l of loops) {
        if (t < l.start || (l.end !== null && t > l.end)) continue;
        const base = v[l.prop] ?? BASE_VALUES[l.prop];
        v[l.prop] = base + l.amplitude * Math.sin(2 * Math.PI * ((t - l.start) / l.period + l.phase));
      }
    }
    out.set(key, v);
  }
  return out;
}

const TRANSFORM_PROPS: PropName[] = ["x", "y", "xPct", "yPct", "z", "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY", "skewX"];
const FILTER_PROPS: PropName[] = ["blur", "brightness", "saturate"];
const CLIP_PROPS: PropName[] = ["clipTop", "clipRight", "clipBottom", "clipLeft"];

export interface StyleOut {
  transform?: string;
  opacity?: string;
  filter?: string;
  clipPath?: string;
  letterSpacing?: string;
  strokeDashoffset?: string;
  text?: string;
}

const f4 = (n: number) => {
  const r = Math.round(n * 10000) / 10000;
  return Object.is(r, -0) ? "0" : String(r);
};

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
export function styleOf(v: Values, counter?: CounterFormat): StyleOut {
  const s: StyleOut = {};
  const has = (p: PropName) => v[p] !== undefined;
  const g = (p: PropName) => v[p] ?? BASE_VALUES[p];
  if (TRANSFORM_PROPS.some(has)) {
    let tr = "translate3d(" + f4(g("x")) + "px," + f4(g("y")) + "px," + f4(g("z")) + "px)";
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
  if (CLIP_PROPS.some(has)) {
    s.clipPath =
      "inset(" +
      CLIP_PROPS.map((p) => f4(Math.min(100, Math.max(0, g(p)))) + "%").join(" ") +
      ")";
  }
  if (has("tracking")) s.letterSpacing = f4(g("tracking")) + "em";
  if (has("draw")) s.strokeDashoffset = f4(1 - Math.min(1, Math.max(0, g("draw"))));
  if (has("counter")) s.text = formatCounter(g("counter"), counter ?? { decimals: 0 });
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
