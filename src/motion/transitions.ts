import { sigmaFor } from "./easing.js";
import { eases, resolveEase, type EaseToken } from "./tokens.js";
import type { EaseSpec, FxSpec, PropName, PropRange, Tween } from "./types.js";

/**
 * Scene transitions: one table (TRANSITION_DEFS) drives the build, the
 * storyboard schema, lint and the generated docs. A transition is tweens on
 * the two scene roots (`<id>.scene`), plus — for some — layers the incoming
 * scene grows: `<id>.reveal` (wraps its camera; carries a mask that must not
 * hide the overlay) and `<id>.fx` (an overlay above it: a flash, a light band).
 * Research: docs/research/2026-10-transitions.md · decision: docs/decisions/0005.
 */
export const TRANSITIONS = [
  "cut",
  "crossfade",
  "dip",
  "push",
  "pushUp",
  "blur",
  "zoom",
  "wipe",
  "whip",
  "punchCut",
  "iris",
  "strips",
  "lightSweep",
] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

export const DIRS = ["left", "right", "up", "down"] as const;
export type Dir = (typeof DIRS)[number];
export const TRANSITION_COLORS = ["accent", "accent-2", "fg", "white"] as const;
export type TransitionColor = (typeof TRANSITION_COLORS)[number];
export type TransitionParam = "ease" | "dir" | "angle" | "feather" | "origin" | "n" | "stagger" | "blur" | "color" | "flash";

/** A storyboard `transition` (into the next scene), duration resolved. */
export interface TransitionSpec {
  type: TransitionType;
  duration: number;
  /** Ease token or cubic-bezier control points; replaces the transition's own curves. */
  ease?: EaseToken | [number, number, number, number];
  /** Direction of travel (push/whip/strips/wipe/lightSweep). */
  dir?: Dir;
  /** wipe: CSS gradient angle of the edge's travel (90 = rightward); overrides dir. */
  angle?: number;
  /** wipe/iris: soft edge, % of the sweep. */
  feather?: number;
  /** iris: centre, % of the frame. */
  origin?: { x: number; y: number };
  /** strips: how many. */
  n?: number;
  /** strips: seconds between strips. */
  stagger?: number;
  /** push/whip: directional motion blur — true = matched to the speed, a number = peak σ px, false = none. */
  blur?: boolean | number;
  /** lightSweep: band colour. */
  color?: TransitionColor;
  /** punchCut: flash strength 0..0.5 (0 = none). */
  flash?: number;
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
  /** Layers the incoming scene needs. */
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
const STEP: Ease = { spec: { type: "steps", n: 1 } };
/** Duration of a hard swap: a step this short lands on the first frame at or after its start. */
const SWAP = 0.001;
const SINE: EaseSpec = { type: "bezier", p: [0.37, 0, 0.63, 1] };
const QUINT_OUT: EaseSpec = { type: "bezier", p: [0.22, 1, 0.36, 1] };
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
      tw(target, start, r3(c.d / 2), { [ch]: [0, sigma] }, named("exit")),
      tw(target, r3(start + c.d / 2), r3(c.d / 2), { [ch]: [sigma, 0] }, named("enter")),
    ];
    if (sigma > 0) {
      res.out.push(...bell(o, c.os));
      res.in.push(...bell(i, 0));
    }
  }
  return res;
}

const bandColor = (c: TransitionColor = "accent") =>
  c === "white" ? "rgba(255,255,255,0.9)" : c === "fg" ? "var(--color-fg)" : `color-mix(in oklab, var(--color-${c}) 70%, white)`;

/** lightSweep geometry: a 35%-feathered wipe, the band as wide as the feather and riding its centre. */
const SWEEP_FEATHER = 35;
const SWEEP_TRAVEL = r3(((100 + SWEEP_FEATHER) / SWEEP_FEATHER) * 100 - 100); // band xPct at p = 1 (≈285.714)
const SWEEP_OPACITY = 0.85;

export const TRANSITION_DEFS: Record<TransitionType, TransitionDef> = {
  cut: {
    description: "Hard cut. The default between punchy kinetic-type beats; cut on the beat.",
    duration: 0.5,
    range: [0, 2],
    params: [],
    build: () => ({ out: [], in: [] }),
  },
  crossfade: {
    description: "Incoming scene fades over the outgoing one. Calm, continuous — for the same surface in a new state.",
    duration: 0.5,
    range: [0.3, 1],
    params: ["ease"],
    build: (c) => ({ out: [], in: [tw(`${c.into}.scene`, 0, c.d, { opacity: [0, 1] }, c.ease("standard"))] }),
  },
  dip: {
    description: "Out fades to the background colour, then in fades up. A breath between chapters.",
    duration: 0.5,
    range: [0.3, 1],
    params: ["ease"],
    build: (c) => ({
      out: [tw(`${c.out}.scene`, c.os, c.d / 2, { opacity: [null, 0] }, c.ease("exit"))],
      in: [tw(`${c.into}.scene`, c.d / 2, c.d / 2, { opacity: [0, 1] }, c.ease("enter"))],
    }),
  },
  push: {
    description: "Incoming pushes the outgoing scene off in the direction of travel (dir, default left). blur: true adds speed-matched motion blur. Sequential steps, carousels.",
    duration: 0.5,
    range: [0.3, 0.8],
    params: ["ease", "dir", "blur"],
    dirs: DIRS,
    build: (c) => push(c, c.spec.dir ?? "left", c.ease("inOut"), c.spec.blur),
  },
  pushUp: {
    description: "push with dir up: incoming pushes up from below. Vertical feeds, lists, 9:16.",
    duration: 0.5,
    range: [0.3, 0.8],
    params: ["ease", "blur"],
    build: (c) => push(c, "up", c.ease("inOut"), c.spec.blur),
  },
  blur: {
    description: "Defocus out, focus in; the outgoing scene stays opaque (no double-exposure dip). Premium, dreamy.",
    duration: 0.5,
    range: [0.4, 1],
    params: ["ease"],
    build: (c) => {
      const e = c.ease("inOut");
      return {
        out: [tw(`${c.out}.scene`, c.os, c.d, { blur: [null, 24] }, e)],
        in: [tw(`${c.into}.scene`, 0, c.d, { opacity: [0, 1], blur: [24, 0] }, e)],
      };
    },
  },
  zoom: {
    // Both scenes move toward the camera; the incoming one never scales below 1,
    // so its edges are never revealed.
    description: "Zoom-through: out scales up and fades, in settles from slightly larger (1.12 → 1). Energy, momentum — into a detail.",
    duration: 0.5,
    range: [0.35, 0.9],
    params: ["ease"],
    build: (c) => ({
      out: [tw(`${c.out}.scene`, c.os, c.d, { scale: [null, 1.3], opacity: [null, 0], blur: [null, 10] }, c.ease("exit"))],
      in: [tw(`${c.into}.scene`, 0, c.d, { scale: [1.12, 1], opacity: [0, 1], blur: [12, 0] }, c.ease("hero"))],
    }),
  },
  wipe: {
    description: "Incoming wipes on with a moving edge (dir, default right). feather (8–20) softens the edge; angle (e.g. 120) runs it diagonally.",
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
  whip: {
    description: "Whip pan: a fast push with heavy motion blur; the swap hides at peak speed. Camera-first product cuts. Keep it short.",
    duration: 0.33,
    range: [0.2, 0.45],
    params: ["ease", "dir", "blur"],
    dirs: DIRS,
    build: (c) => push(c, c.spec.dir ?? "left", c.ease("sharp"), c.spec.blur ?? true),
  },
  punchCut: {
    description: "Editorial punch: the outgoing scene pushes in, a hard swap at 45%, the incoming settles from 1.06 with a two-frame flash.",
    duration: 0.37,
    range: [0.25, 0.5],
    params: ["ease", "flash"],
    layers: {
      fx: () => ({ style: "position:absolute;inset:0;background:#fff;mix-blend-mode:plus-lighter;opacity:0;pointer-events:none", inner: "" }),
    },
    build: (c) => {
      const cut = r3(c.d * 0.45);
      const frame = r3(1 / c.frame.fps);
      const flash = c.spec.flash ?? 0.2;
      const fx = `${c.into}.fx`;
      // The swap is a 1ms step, so the incoming scene (and the flash) own the first frame at or after the cut.
      return {
        out: [tw(`${c.out}.scene`, c.os, cut, { scale: [null, 1.04] }, c.ease("exit"))],
        in: [
          tw(`${c.into}.scene`, cut, SWAP, { opacity: [0, 1] }, STEP),
          tw(`${c.into}.scene`, cut, r3(c.d - cut), { scale: [1.06, 1] }, c.ease("standard")),
          ...(flash > 0
            ? [tw(fx, cut, SWAP, { opacity: [0, flash] }, STEP), tw(fx, r3(cut + frame), r3(2 * frame), { opacity: [flash, 0] }, named("exit"))]
            : []),
        ],
      };
    },
  },
  iris: {
    description: "Circular reveal from origin (default centre), to the farthest corner. Focus on a point — a button, a logo.",
    duration: 0.6,
    range: [0.4, 0.9],
    params: ["ease", "origin", "feather"],
    build: (c) => {
      const o = c.spec.origin ?? { x: 50, y: 50 };
      return { out: [], in: [tw(`${c.into}.scene`, 0, c.d, { fx: [0, 1] }, c.ease("inOut"), { kind: "iris", x: o.x, y: o.y, feather: c.spec.feather ?? 1.5 })] };
    },
  },
  strips: {
    description: "n staggered strips (default 6) reveal the next scene toward dir (default up). High-energy accent for social and kinetic cuts.",
    duration: 0.5,
    range: [0.3, 0.8],
    params: ["ease", "dir", "n", "stagger"],
    dirs: DIRS,
    build: (c) => {
      const n = c.spec.n ?? 6;
      const each = Math.min(c.spec.stagger ?? 0.03, (c.d * 0.6) / Math.max(1, n - 1));
      const fx: FxSpec = { kind: "strips", n, dir: c.spec.dir ?? "up", stagger: r3(each / c.d), ease: c.spec.ease ? c.ease("inOut").spec : QUINT_OUT };
      return { out: [], in: [tw(`${c.into}.scene`, 0, c.d, { fx: [0, 1] }, { spec: eases.linear as EaseSpec, name: "linear" }, fx)] };
    },
  },
  lightSweep: {
    description: "A luminous accent band sweeps across the cut (dir left/right) while the next scene is revealed beneath it. Logo and hero moments — once per video.",
    duration: 0.6,
    range: [0.45, 0.9],
    params: ["ease", "dir", "color"],
    dirs: ["left", "right"],
    layers: {
      reveal: true,
      fx: (spec) => {
        const right = (spec.dir ?? "right") === "right";
        return {
          style: `position:absolute;top:0;bottom:0;${right ? "left" : "right"}:0;width:${SWEEP_FEATHER}%;mix-blend-mode:plus-lighter;opacity:${SWEEP_OPACITY};pointer-events:none;transform:translate(${right ? -100 : 100}%,0)`,
          inner: `<div style="position:absolute;top:0;bottom:0;left:-30%;right:-30%;transform:skewX(-12deg);background:linear-gradient(90deg,transparent 0%,${bandColor(spec.color)} 50%,transparent 100%)"></div>`,
        };
      },
    },
    build: (c) => {
      const e = c.ease(SINE);
      const right = (c.spec.dir ?? "right") === "right";
      return {
        out: [tw(`${c.out}.scene`, c.os, r3(c.d * 0.6), { brightness: [null, 1.25] }, e)],
        in: [
          tw(`${c.into}.reveal`, 0, c.d, { fx: [0, 1] }, e, { kind: "wipe", angle: right ? 90 : 270, feather: SWEEP_FEATHER }),
          tw(`${c.into}.fx`, 0, c.d, { xPct: right ? [-100, SWEEP_TRAVEL] : [100, -SWEEP_TRAVEL] }, e),
          // The band's skewed overhang is still on the frame edge at p = 1: let the light die as it leaves.
          tw(`${c.into}.fx`, r3(c.d * 0.8), r3(c.d * 0.2), { opacity: [SWEEP_OPACITY, 0] }, named("exit")),
        ],
      };
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
