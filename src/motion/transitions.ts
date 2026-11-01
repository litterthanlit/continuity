import { sigmaFor } from "./easing.js";
import type { Register } from "./register.js";
import { eases, fitEase, resolveEase, type EaseToken } from "./tokens.js";
import type { EaseSpec, FxSpec, PropName, PropRange, Tween } from "./types.js";

/**
 * Scene transitions: one table (TRANSITION_DEFS) drives the build, the
 * storyboard schema, lint and the generated docs. litt's language
 * (docs/decisions/0006): a cut on the beat is the primary; crossfade, dip,
 * push and a feathered wipe are the accents. Nothing that performs. The energetic
 * register (docs/decisions/0007) adds one move of its own: `depth`, the camera
 * flying through stacked scenes (and back out, to close the loop). A transition is tweens on
 * the two scene roots (`<id>.scene`), plus — for some — layers the incoming
 * scene grows: `<id>.reveal` (wraps its camera; carries a mask that must not
 * hide the overlay) and `<id>.fx` (an overlay above it: a flash, a light band).
 * Research: docs/research/2026-10-transitions.md · decision: docs/decisions/0005.
 */
export const TRANSITIONS = ["cut", "crossfade", "dip", "push", "pushUp", "wipe", "depth", "morph"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

/** Planar directions (push, wipe). */
export const PLANAR_DIRS = ["left", "right", "up", "down"] as const;
export type PlanarDir = (typeof PLANAR_DIRS)[number];
/** Every direction a transition can take: planar, plus depth's in (forward through the stack) and out (back). */
export const DIRS = [...PLANAR_DIRS, "in", "out"] as const;
export type Dir = (typeof DIRS)[number];
export type TransitionParam = "ease" | "dir" | "angle" | "feather" | "blur" | "pairs" | "squash" | "arc";

/** A shared element: the same id in both scenes, or [outgoing id, incoming id]. */
export type MorphPair = string | [string, string];

/** A storyboard `transition` (into the next scene), duration resolved. */
export interface TransitionSpec {
  type: TransitionType;
  duration: number;
  /** Ease token or cubic-bezier control points; replaces the transition's own curves. */
  ease?: EaseToken | [number, number, number, number];
  /** Direction of travel (push/wipe: planar; depth: in or out). */
  dir?: Dir;
  /** wipe: CSS gradient angle of the edge's travel (90 = rightward); overrides dir. */
  angle?: number;
  /** wipe: soft edge, % of the sweep. */
  feather?: number;
  /** push: directional motion blur — true = matched to the speed, a number = peak σ px, false = none. */
  blur?: boolean | number;
  /** morph: the elements that carry the cut, outgoing → incoming. */
  pairs?: MorphPair[];
  /** morph: squash and stretch of the carriers along their travel, 0..0.5. */
  squash?: number;
  /** morph: bend of the travel path, as a share of its length (−0.5..0.5; 0 = straight). */
  arc?: number;
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

/** What a layer can read while the build composes the incoming scene. */
export interface LayerContext {
  out: string;
  into: string;
  /** Rendered HTML of an element (full id `<scene>.<id>`), from either scene. */
  html(id: string): string | undefined;
}

export interface TransitionDef {
  description: string;
  /** Default duration, seconds. */
  duration: number;
  /** Craft range for lint, seconds. */
  range: [number, number];
  params: readonly TransitionParam[];
  dirs?: readonly Dir[];
  /** Registers it belongs to (docs/decisions/0007); omitted = every register. */
  registers?: readonly Register[];
  /** Layers the incoming scene needs (none of litt's transitions do; the build still supports them). */
  layers?: { reveal?: boolean; fx?: (spec: TransitionSpec, ctx: LayerContext) => FxLayer };
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
const DIR_ANGLE: Record<PlanarDir, number> = { right: 90, left: 270, down: 180, up: 0 };
/** How far depth carries a scene past the viewer, and how far back the next one waits. */
const DEPTH_NEAR = 1.8;
const DEPTH_FAR = 0.6;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Translate both scenes edge to edge in the direction of travel (+ an optional motion-blur bell). */
function push(c: Ctx, dir: PlanarDir, ease: Ease, blur: boolean | number | undefined): { out: Tween[]; in: Tween[] } {
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

export function pairsOf(spec: TransitionSpec): Array<[string, string]> {
  return (spec.pairs ?? []).map((p) => (typeof p === "string" ? [p, p] : p));
}

/** An element's HTML as a carrier: no ids, so it neither collides with nor stands in for the original. */
function carrierClone(html: string): string {
  return html.replace(/\s(?:data-ct|id)="[^"]*"/g, "");
}

const STEP: Ease = { spec: { type: "steps", n: 1 } };

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
    dirs: PLANAR_DIRS,
    build: (c) => push(c, (c.spec.dir as PlanarDir | undefined) ?? "left", c.ease("inOut"), c.spec.blur),
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
    dirs: PLANAR_DIRS,
    build: (c) => {
      const e = c.ease("inOut");
      const i = `${c.into}.scene`;
      const { angle, feather } = c.spec;
      const dir = c.spec.dir as PlanarDir | undefined;
      if (angle === undefined && feather === undefined) {
        const clip: Record<PlanarDir, PropName> = { right: "clipRight", left: "clipLeft", down: "clipBottom", up: "clipTop" };
        return { out: [], in: [tw(i, 0, c.d, { [clip[dir ?? "right"]]: [100, 0] }, e)] };
      }
      const fx: FxSpec = { kind: "wipe", angle: angle ?? DIR_ANGLE[dir ?? "right"], feather: feather ?? 12 };
      return { out: [], in: [tw(i, 0, c.d, { fx: [0, 1] }, e, fx)] };
    },
  },
  depth: {
    description:
      "Energetic register. The camera flies through the stack: the outgoing scene grows past the viewer as the next one comes forward from behind (dir in, default). dir out is the reverse — close a reel by flying back out of where it opened.",
    duration: 0.6,
    range: [0.4, 1],
    params: ["ease", "dir"],
    dirs: ["in", "out"],
    registers: ["energetic"],
    build: (c) => {
      const e = c.ease("steep");
      const fade = named("out");
      const back = c.spec.dir === "out";
      const o = `${c.out}.scene`;
      const i = `${c.into}.scene`;
      const q = r3(c.d / 4);
      const h = r3(c.d / 2);
      return {
        out: [
          tw(o, c.os, c.d, { scale: [1, back ? DEPTH_FAR : DEPTH_NEAR] }, e),
          tw(o, r3(c.os + q), h, { opacity: [null, 0] }, fade),
        ],
        in: [tw(i, 0, c.d, { scale: [back ? DEPTH_NEAR : DEPTH_FAR, 1] }, e), tw(i, q, h, { opacity: [0, 1] }, fade)],
      };
    },
  },
  morph: {
    description:
      "A shared element carries the cut: each pair travels from its place in the outgoing scene to its place in the incoming one (position and size; shapes morph their outline) while the rest crossfades under it — the scenes flow instead of cutting. pairs: [\"logo\"] (same id) or [[\"title\", \"card\"]]; squash 0..0.5 for mass; arc bends the path.",
    duration: 0.6,
    range: [0.3, 1.2],
    params: ["ease", "pairs", "squash", "arc"],
    layers: {
      reveal: true,
      fx: (spec, ctx) => ({
        style: "position:absolute;inset:0;pointer-events:none",
        inner: pairsOf(spec)
          .map(([a, b], i) => {
            const side = (s: "a" | "b", html: string | undefined) =>
              `<div data-ct-side="${s}" style="position:absolute;left:0;top:0;transform-origin:0 0">${carrierClone(html ?? "")}</div>`;
            return (
              `<div data-ct="${ctx.into}.match-${i}" data-ct-match="${ctx.out}.${a} ${ctx.into}.${b}" data-ct-arc="${spec.arc ?? 0}" ` +
              `style="position:absolute;left:0;top:0;visibility:hidden">` +
              side("a", ctx.html(`${ctx.out}.${a}`)) +
              side("b", ctx.html(`${ctx.into}.${b}`)) +
              `</div>`
            );
          })
          .join(""),
      }),
    },
    build: (c) => {
      const pairs = pairsOf(c.spec);
      const carry = c.ease("inOut");
      return {
        // The originals hand over to the carriers: A leaves at the cut, B arrives when the carrier lands.
        out: pairs.map(([a]) => tw(`${c.out}.${a}`, c.os, 0, { opacity: [null, 0] }, named("linear"))),
        in: [
          tw(`${c.into}.reveal`, 0, c.d, { opacity: [0, 1] }, named("inOut")),
          ...pairs.map(([, b]) => tw(`${c.into}.${b}`, 0, c.d, { opacity: [0, 1] }, STEP)),
          ...pairs.map((_, i) => ({ ...tw(`${c.into}.match-${i}`, 0, c.d, { match: [0, 1] }, carry), ...(c.spec.squash ? { squash: c.spec.squash } : {}) })),
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
  const given: Ease | undefined =
    spec.ease === undefined ? undefined : typeof spec.ease === "string" ? resolveEase(spec.ease) : { spec: { type: "bezier", p: spec.ease } };
  const override = given && { spec: fitEase(given.spec, given.name, d), name: given.name };
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
