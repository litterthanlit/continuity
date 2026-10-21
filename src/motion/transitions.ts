import { sigmaFor } from "./easing.js";
import { eases, resolveEase, type EaseToken } from "./tokens.js";
import type { EaseSpec, FxSpec, PropName, PropRange, Tween } from "./types.js";

/**
 * Scene transitions: one table (TRANSITION_DEFS) drives the build, the
 * storyboard schema, lint and the generated docs. litt's language
 * (docs/decisions/0006): a cut on the beat is the primary; crossfade, dip,
 * push and a feathered wipe are the accents. Nothing that performs. A transition is tweens on
 * the two scene roots (`<id>.scene`), plus — for some — layers the incoming
 * scene grows: `<id>.reveal` (wraps its camera; carries a mask that must not
 * hide the overlay) and `<id>.fx` (an overlay above it: a flash, a light band).
 * Research: docs/research/2026-10-transitions.md · decision: docs/decisions/0005.
 */
export const TRANSITIONS = ["cut", "crossfade", "dip", "push", "pushUp", "wipe"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

export const DIRS = ["left", "right", "up", "down"] as const;
export type Dir = (typeof DIRS)[number];
export type TransitionParam = "ease" | "dir" | "angle" | "feather" | "blur";

/** A storyboard `transition` (into the next scene), duration resolved. */
export interface TransitionSpec {
  type: TransitionType;
  duration: number;
  /** Ease token or cubic-bezier control points; replaces the transition's own curves. */
  ease?: EaseToken | [number, number, number, number];
  /** Direction of travel (push/wipe). */
  dir?: Dir;
  /** wipe: CSS gradient angle of the edge's travel (90 = rightward); overrides dir. */
  angle?: number;
  /** wipe: soft edge, % of the sweep. */
  feather?: number;
  /** push: directional motion blur — true = matched to the speed, a number = peak σ px, false = none. */
  blur?: boolean | number;
}

export interface TransitionFrame {
  width: number;
  height: number;
  fps: number;
}

interface Ctx {
  spec: TransitionSpec;
  /** Outgoing / incoming scene ids. */
  out: string;
  into: string;
  /** Outgoing tweens start here (outgoing scene-local seconds). */
  os: number;
  d: number;
  frame: TransitionFrame;
  /** The spec's ease override, else `fallback`. */
  ease(fallback: EaseToken | EaseSpec): { spec: EaseSpec; name?: string };
}

export interface FxLayer {
  /** Inline style of the overlay element (it is animated, so keep transforms on children). */
  style: string;
  inner: string;
}

export interface TransitionDef {
  description: string;
  /** Default duration, seconds. */
  duration: number;
  /** Craft range for lint, seconds. */
  range: [number, number];
  params: readonly TransitionParam[];
  dirs?: readonly Dir[];
  /** Layers the incoming scene needs (none of litt's transitions do; the build still supports them). */
  layers?: { reveal?: boolean; fx?: (spec: TransitionSpec) => FxLayer };
  build(c: Ctx): { out: Tween[]; in: Tween[] };
}

type Props = Partial<Record<PropName, PropRange>>;
type Ease = { spec: EaseSpec; name?: string };

function tw(target: string, start: number, duration: number, props: Props, ease: Ease, fx?: FxSpec): Tween {
  const t: Tween = { target, kind: "transition", start, duration, ease: ease.spec, easeName: ease.name, props };
  if (fx) t.fx = fx;
  return t;
}

const named = (n: EaseToken): Ease => ({ spec: eases[n] as EaseSpec, name: n });
/** The motion-blur bell rises as the push accelerates and falls as it lands. */
const BLUR_RISE: Ease = { spec: { type: "bezier", p: [0.3, 0, 0.8, 0.15] } };
const BLUR_FALL: Ease = { spec: { type: "bezier", p: [0.05, 0.7, 0.1, 1] } };
const DIR_ANGLE: Record<Dir, number> = { right: 90, left: 270, down: 180, up: 0 };
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Translate both scenes edge to edge in the direction of travel (+ an optional motion-blur bell). */
function push(c: Ctx, dir: Dir, ease: Ease, blur: boolean | number | undefined): { out: Tween[]; in: Tween[] } {
  const axis: PropName = dir === "left" || dir === "right" ? "xPct" : "yPct";
  const sign = dir === "left" || dir === "up" ? -1 : 1;
  const o = `${c.out}.scene`;
  const i = `${c.into}.scene`;
  const res = { out: [tw(o, c.os, c.d, { [axis]: [0, sign * 100] }, ease)], in: [tw(i, 0, c.d, { [axis]: [-sign * 100, 0] }, ease)] };
  if (blur) {
    const distance = axis === "xPct" ? c.frame.width : c.frame.height;
    const sigma = typeof blur === "number" ? blur : sigmaFor(ease.spec, distance, c.d, c.frame.fps);
    const ch: PropName = axis === "xPct" ? "blurX" : "blurY";
    const bell = (target: string, start: number) => [
      tw(target, start, r3(c.d / 2), { [ch]: [0, sigma] }, BLUR_RISE),
      tw(target, r3(start + c.d / 2), r3(c.d / 2), { [ch]: [sigma, 0] }, BLUR_FALL),
    ];
    if (sigma > 0) {
      res.out.push(...bell(o, c.os));
      res.in.push(...bell(i, 0));
    }
  }
  return res;
}

export const TRANSITION_DEFS: Record<TransitionType, TransitionDef> = {
  cut: {
    description: "Hard cut, on the beat. The primary: most of a litt edit is cuts.",
    duration: 0.5,
    range: [0, 2],
    params: [],
    build: () => ({ out: [], in: [] }),
  },
  crossfade: {
    description: "The incoming scene fades over the outgoing one. The same surface in a new state.",
    duration: 0.4,
    range: [0.25, 0.8],
    params: ["ease"],
    build: (c) => ({ out: [], in: [tw(`${c.into}.scene`, 0, c.d, { opacity: [0, 1] }, c.ease("inOut"))] }),
  },
  dip: {
    description: "Out fades to the canvas, then in fades up. A breath between chapters, before the end card.",
    duration: 0.5,
    range: [0.3, 1],
    params: ["ease"],
    build: (c) => ({
      out: [tw(`${c.out}.scene`, c.os, c.d / 2, { opacity: [null, 0] }, c.ease("out"))],
      in: [tw(`${c.into}.scene`, c.d / 2, c.d / 2, { opacity: [0, 1] }, c.ease("out"))],
    }),
  },
  push: {
    description: "The incoming scene pushes the outgoing one off in the direction of travel (dir, default left = reading order). Sequential steps. blur: true when it moves fast.",
    duration: 0.5,
    range: [0.3, 0.8],
    params: ["ease", "dir", "blur"],
    dirs: DIRS,
    build: (c) => push(c, c.spec.dir ?? "left", c.ease("inOut"), c.spec.blur),
  },
  pushUp: {
    description: "push with dir up: the incoming scene pushes up from below. Lists, feeds, 9:16.",
    duration: 0.5,
    range: [0.3, 0.8],
    params: ["ease", "blur"],
    build: (c) => push(c, "up", c.ease("inOut"), c.spec.blur),
  },
  wipe: {
    description: "The incoming scene wipes on with a moving edge (dir, default right). feather (8–20) softens it; angle (e.g. 120) runs it diagonally. A state revealed.",
    duration: 0.5,
    range: [0.35, 0.8],
    params: ["ease", "dir", "angle", "feather"],
    dirs: DIRS,
    build: (c) => {
      const e = c.ease("inOut");
      const i = `${c.into}.scene`;
      const { dir, angle, feather } = c.spec;
      if (angle === undefined && feather === undefined) {
        const clip: Record<Dir, PropName> = { right: "clipRight", left: "clipLeft", down: "clipBottom", up: "clipTop" };
        return { out: [], in: [tw(i, 0, c.d, { [clip[dir ?? "right"]]: [100, 0] }, e)] };
      }
      const fx: FxSpec = { kind: "wipe", angle: angle ?? DIR_ANGLE[dir ?? "right"], feather: feather ?? 12 };
      return { out: [], in: [tw(i, 0, c.d, { fx: [0, 1] }, e, fx)] };
    },
  },
};

export const transitionDescriptions: Record<TransitionType, string> = Object.fromEntries(
  TRANSITIONS.map((t) => [t, TRANSITION_DEFS[t].description]),
) as Record<TransitionType, string>;

/**
 * Tweens that realise a transition. Outgoing tweens use the outgoing scene's
 * local clock (they end at its last frame); incoming tweens start at the
 * incoming scene's t=0.
 */
export function transitionTweens(
  spec: TransitionSpec,
  out: { id: string; duration: number },
  into: { id: string },
  frame: TransitionFrame = { width: 1920, height: 1080, fps: 30 },
): { out: Tween[]; in: Tween[] } {
  const d = spec.duration;
  const override = spec.ease === undefined ? undefined : typeof spec.ease === "string" ? resolveEase(spec.ease) : { spec: { type: "bezier" as const, p: spec.ease } };
  return TRANSITION_DEFS[spec.type].build({
    spec,
    out: out.id,
    into: into.id,
    os: Math.max(0, out.duration - d),
    d,
    frame,
    ease: (fallback) => override ?? (typeof fallback === "string" ? named(fallback) : { spec: fallback }),
  });
}
