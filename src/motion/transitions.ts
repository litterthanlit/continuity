import { sigmaFor } from "./easing.js";
import { LAYER_TRAVEL, layerPlan, type LayerElement } from "./layers.js";
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
export const TRANSITIONS = ["cut", "match", "carry", "crossfade", "dip", "push", "pushUp", "wipe", "pixels", "depth", "morph", "portal"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

/** Planar directions (push, wipe). */
export const PLANAR_DIRS = ["left", "right", "up", "down"] as const;
export type PlanarDir = (typeof PLANAR_DIRS)[number];
/** Every direction a transition can take: planar, plus depth's in (forward through the stack) and out (back). */
export const DIRS = [...PLANAR_DIRS, "in", "out"] as const;
export type Dir = (typeof DIRS)[number];
export type TransitionParam = "ease" | "dir" | "angle" | "feather" | "blur" | "pairs" | "squash" | "arc" | "via" | "distance" | "layers";

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
  /** portal: the element the camera goes through — the outgoing scene's (dir in) or the incoming scene's (dir out). */
  via?: string;
  /** carry: how far the camera travels through the cut, % of the frame along dir. */
  distance?: number;
  /** push, pushUp, carry: each top-level element moves on top of its scene, in a wave along the travel (layers.ts). */
  layers?: boolean;
}

/** Each scene's top-level storyboard elements with a role, for a layered handoff. */
export interface TransitionElements {
  out: LayerElement[];
  in: LayerElement[];
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
  /** Top-level elements of both scenes (empty when a neighbour is a placeholder). */
  elements: TransitionElements;
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
  /** A hard cut: the scenes do not overlap; its tweens run inside the incoming scene, after the cut. */
  cut?: boolean;
  /**
   * Layers the incoming scene needs. `under`: the incoming scene is stacked below the outgoing one
   * for the transition (the outgoing scene shrinks away on top of it).
   */
  layers?: { reveal?: boolean; fx?: (spec: TransitionSpec, ctx: LayerContext) => FxLayer; under?: (spec: TransitionSpec) => boolean };
  /**
   * A scene root that travels without scaling (carry) exposes the frame behind its trailing edge.
   * Its backdrop and grain bleed past the root by this share of the frame along `axis` — `out` for
   * the outgoing scene, `in` for the incoming one — while its root moves (SceneTimeline.bleed).
   */
  bleed?: (spec: TransitionSpec) => { axis: "x" | "y"; out: number; in: number };
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
/** pixels: cells across the frame's long side. Big enough to read as pixels, not as noise. */
const PIXEL_CELLS = 24;

/** Translate both scenes edge to edge in the direction of travel (+ an optional motion-blur bell). */
function push(c: Ctx, dir: PlanarDir, ease: Ease, blur: boolean | number | undefined): { out: Tween[]; in: Tween[] } {
  const axis: PropName = dir === "left" || dir === "right" ? "xPct" : "yPct";
  const sign = dir === "left" || dir === "up" ? -1 : 1;
  const o = `${c.out}.scene`;
  const i = `${c.into}.scene`;
  const res = { out: [tw(o, c.os, c.d, { [axis]: [0, sign * 100] }, ease)], in: [tw(i, 0, c.d, { [axis]: [-sign * 100, 0] }, ease)] };
  const l = layered(c, dir, { start: c.os, duration: c.d, ease, inDuration: c.d, inEase: ease, cut: false });
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
  return { out: [...res.out, ...l.out], in: [...res.in, ...l.in] };
}

/**
 * Layered handoff (`layers: true`): on top of the planes, each top-level element shifts a little
 * further along the travel, in a wave that starts at the leading edge (layerPlan: depth by role,
 * delay by anchor). Shift channels add to x/y, so each element's own entrance runs through it.
 *
 * Every layer moves like its plane, so none jumps:
 * - push (both scenes on screen, at rest at both ends): outgoing, a layer leaves at the plane's
 *   start + its delay and lands with it; incoming, it leaves with the plane at 0 and takes its
 *   delay longer to land — both on the plane's ease, depth × LAYER_TRAVEL of the frame each.
 * - carry (a cut at peak speed): each layer is a t² move of its own, split at the cut like the
 *   plane's. With M the largest delay, a layer leaves M − delay before the plane (the leader
 *   first, never later than the plane) and lands delay after it: L_o = lead + M − delay before the
 *   cut, T_i = tail + delay after. Its travel, 2 × depth × LAYER_TRAVEL, splits in proportion
 *   (S_o = v·L_o/2, S_i = v·T_i/2 with v = 4·depth·travel/(d + M)), so it crosses the cut at
 *   the speed v on both sides — the same for every layer of a depth, whatever its delay.
 */
function layered(
  c: Ctx,
  dir: PlanarDir,
  plane: { start: number; duration: number; ease: Ease; inDuration: number; inEase: Ease; cut: boolean },
): { out: Tween[]; in: Tween[] } {
  if (!c.spec.layers) return { out: [], in: [] };
  const horizontal = dir === "left" || dir === "right";
  const ch: PropName = horizontal ? "shiftX" : "shiftY";
  const sign = dir === "left" || dir === "up" ? -1 : 1;
  const travel = LAYER_TRAVEL * (horizontal ? c.frame.width : c.frame.height);
  const end = plane.start + plane.duration;
  const outPlan = layerPlan(c.elements.out, dir, c.d);
  const inPlan = layerPlan(c.elements.in, dir, c.d);
  const out = (id: string, start: number, shift: number) =>
    tw(`${c.out}.${id}`, start, r3(end - start), { [ch]: [0, r3(sign * shift)] }, plane.ease);
  const into = (id: string, duration: number, shift: number) =>
    tw(`${c.into}.${id}`, 0, duration, { [ch]: [r3(-sign * shift), 0] }, plane.inEase);
  if (!plane.cut) {
    return {
      out: outPlan.map((s) => out(s.id, r3(plane.start + s.delay), s.depth * travel)),
      in: inPlan.map((s) => into(s.id, r3(plane.inDuration + s.delay), s.depth * travel)),
    };
  }
  const M = Math.max(0, ...outPlan.map((s) => s.delay), ...inPlan.map((s) => s.delay));
  const speed = (depth: number) => (4 * depth * travel) / (c.d + M);
  return {
    out: outPlan.map((s) => {
      const start = r3(Math.max(0, plane.start - (M - s.delay)));
      return out(s.id, start, (speed(s.depth) * (end - start)) / 2);
    }),
    in: inPlan.map((s) => {
      const duration = r3(plane.inDuration + s.delay);
      return into(s.id, duration, (speed(s.depth) * duration) / 2);
    }),
  };
}

export function pairsOf(spec: TransitionSpec): Array<[string, string]> {
  return (spec.pairs ?? []).map((p) => (typeof p === "string" ? [p, p] : p));
}

/** An element's HTML as a carrier: no ids, so it neither collides with nor stands in for the original. */
function carrierClone(html: string): string {
  return html.replace(/\s(?:data-ct|id)="[^"]*"/g, "");
}

const STEP: Ease = { spec: { type: "steps", n: 1 } };

/** carry: t² and its mirror, exactly — the velocity at the end of one equals the start of the other. */
const QUAD_IN: Ease = { spec: { type: "bezier", p: [1 / 3, 0, 2 / 3, 1 / 3] } };
const QUAD_OUT: Ease = { spec: { type: "bezier", p: [1 / 3, 2 / 3, 2 / 3, 1] } };
/** carry: the share of the move before the cut (the rest decelerates after it). */
const CARRY_LEAD = 0.4;
/** carry: default travel through the cut, % of the frame — a drift, not a whip. */
export const CARRY_DISTANCE = 8;
/** carry: auto motion blur from this peak speed up, px per frame. */
const CARRY_BLUR_FROM = 40;
/** portal: how much of the move the incoming scene takes to fade up inside the window. */
const PORTAL_FADE = 0.3;

/** carry: how far (% of the frame) each scene travels — the outgoing one before the cut, the incoming one after. */
function carryTravel(distance: number): { out: number; in: number } {
  return { out: distance * CARRY_LEAD, in: distance * (1 - CARRY_LEAD) };
}

/**
 * A cut on movement: the camera is already travelling when the cut lands. The outgoing scene
 * accelerates (t²) for the lead, the cut swaps scenes at peak speed, and the incoming one
 * decelerates (mirrored) from exactly that speed to rest — one continuous move across two shots.
 */
function carry(c: Ctx): { out: Tween[]; in: Tween[] } {
  const dir = (c.spec.dir as PlanarDir | undefined) ?? "left";
  const axis: PropName = dir === "left" || dir === "right" ? "xPct" : "yPct";
  const sign = dir === "left" || dir === "up" ? -1 : 1;
  const D = c.spec.distance ?? CARRY_DISTANCE;
  const lead = r3(c.d * CARRY_LEAD);
  const tail = r3(c.d - lead);
  const o = `${c.out}.scene`;
  const i = `${c.into}.scene`;
  const start = r3(c.os + c.d - lead);
  // Translation only: a scale about the frame centre would add a radial velocity that flips sign at
  // the cut (one side of the frame slows, the other surges). The trailing edge is covered by the
  // backdrop, which bleeds past the root by the travel while the scene moves (carryBleed).
  const { out: outX, in: inX } = carryTravel(D);
  const res = {
    out: [tw(o, start, lead, { [axis]: [0, r3(sign * outX)] }, QUAD_IN)],
    in: [tw(i, 0, tail, { [axis]: [r3(-sign * inX), 0] }, QUAD_OUT)],
  };
  const l = layered(c, dir, { start, duration: lead, ease: QUAD_IN, inDuration: tail, inEase: QUAD_OUT, cut: true });
  const frame = axis === "xPct" ? c.frame.width : c.frame.height;
  const peak = (2 * (D / 100) * frame * CARRY_LEAD) / Math.max(1e-3, lead * c.frame.fps);
  const blur = c.spec.blur ?? peak >= CARRY_BLUR_FROM;
  if (blur) {
    const sigma = typeof blur === "number" ? blur : sigmaFor(QUAD_OUT.spec, (D / 100) * frame * (1 - CARRY_LEAD), tail, c.frame.fps);
    const ch: PropName = axis === "xPct" ? "blurX" : "blurY";
    if (sigma > 0) {
      res.out.push(tw(o, start, lead, { [ch]: [0, sigma] }, named("linear")));
      res.in.push(tw(i, 0, tail, { [ch]: [sigma, 0] }, named("linear")));
    }
  }
  return { out: [...res.out, ...l.out], in: [...res.in, ...l.in] };
}

/**
 * The camera goes through an element: dir in, the outgoing scene grows until `via` fills the frame
 * and the incoming scene is what was inside it, opening from its rounded rect; dir out, the
 * outgoing scene shrinks into `via` in the incoming one (a pull-back to the screen it was on).
 * Both scene roots move as one rig, so the window stays locked to the element; the geometry is
 * measured at prepare (placeholders here are the identity).
 */
function portal(c: Ctx): { out: Tween[]; in: Tween[] } {
  const e = c.ease("inOut");
  const back = c.spec.dir === "out";
  const via = back ? `${c.into}.${c.spec.via}` : `${c.out}.${c.spec.via}`;
  const at = back ? c.d : c.os;
  const rig: Props = { scale: [1, 1], x: [0, 0], y: [0, 0] };
  const win: Props = { ...rig, clipTop: [0, 0], clipRight: [0, 0], clipBottom: [0, 0], clipLeft: [0, 0], clipRound: [0, 0] };
  const o = `${c.out}.scene`;
  const i = `${c.into}.scene`;
  const measured = (t: Tween, role: "inner" | "outer"): Tween => ({ ...t, measure: { kind: "portal", via, at, role, dir: back ? "out" : "in" } });
  const fade = r3(c.d * PORTAL_FADE);
  if (back) {
    return {
      out: [measured(tw(o, c.os, c.d, win, e), "inner"), tw(o, r3(c.os + c.d - fade), fade, { opacity: [null, 0] }, named("out"))],
      in: [measured(tw(i, 0, c.d, rig, e), "outer")],
    };
  }
  return {
    out: [measured(tw(o, c.os, c.d, rig, e), "outer")],
    in: [measured(tw(i, 0, c.d, win, e), "inner"), tw(i, 0, fade, { opacity: [0, 1] }, named("out"))],
  };
}

export const TRANSITION_DEFS: Record<TransitionType, TransitionDef> = {
  cut: {
    description: "Hard cut, on the beat. The primary: most of a litt edit is cuts.",
    duration: 0.5,
    range: [0, 2],
    params: [],
    build: () => ({ out: [], in: [] }),
  },
  match: {
    description:
      "A match cut: a hard cut where each paired element of the incoming scene starts exactly where its partner was in the outgoing one (place and size, measured), then settles into its own place over the duration, so the eye carries straight across the cut. If the partner is moving at the cut (≥ 60 px/s), the element leaves the cut at that velocity and slows into its place on one curve (place it ⅓–⅔ of speed × duration along the travel, or it must speed up after the cut); its fill (only between two opaque solid fills) and corner radius start as the partner's and turn into its own. pairs: [\"logo\"] (same id) or [[\"ring\", \"badge\"]]. A primary move, like a cut: it is not an accent.",
    duration: 0.6,
    range: [0.3, 1.2],
    params: ["ease", "pairs"],
    cut: true,
    // Per pair, tweens the runtime fills from the layout at prepare (resolveMeasured): the place
    // (where A was), the velocity A had on its last frame (one travel per axis, match.ts: when A
    // is moving the travel leaves the place and rides these), and the shape (A's fill and corner
    // turning into B's).
    build: (c) => ({
      out: [],
      in: pairsOf(c.spec).flatMap(([a, b]): Tween[] => {
        const target = `${c.into}.${b}`;
        const from = `${c.out}.${a}`;
        const ease = c.ease("out");
        return [
          { ...tw(target, 0, c.d, { x: [0, 0], y: [0, 0], scale: [1, 1] }, ease), measure: { kind: "match", from } },
          { ...tw(target, 0, c.d, { shiftX: [0, 0] }, { spec: { type: "impulse" } }), measure: { kind: "matchVelocity", from, axis: "x" } },
          { ...tw(target, 0, c.d, { shiftY: [0, 0] }, { spec: { type: "impulse" } }), measure: { kind: "matchVelocity", from, axis: "y" } },
          { ...tw(target, 0, c.d, { paint: [0, 1], corner: [0, 0] }, ease), measure: { kind: "matchShape", from } },
        ];
      }),
    }),
  },
  carry: {
    description:
      "A cut on movement: the camera is already travelling when the cut lands. The outgoing scene accelerates in the direction of travel (dir, default left), the cut swaps the scenes at peak speed, and the incoming one decelerates from that same speed to rest — two shots, one move. distance: % of the frame (default 8, a drift; 30–60 in the energetic register is a whip pan); blur follows the speed. Each scene only translates (no zoom), so every point of the frame keeps one speed through the cut; while it travels its backdrop bleeds past the edge, so no edge shows. A primary move, like a cut.",
    duration: 0.5,
    range: [0.3, 1],
    params: ["dir", "distance", "blur", "layers"],
    dirs: PLANAR_DIRS,
    cut: true,
    bleed: (spec) => {
      const t = carryTravel(spec.distance ?? CARRY_DISTANCE);
      return { axis: spec.dir === "up" || spec.dir === "down" ? "y" : "x", out: t.out / 100, in: t.in / 100 };
    },
    build: carry,
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
    params: ["ease", "dir", "blur", "layers"],
    dirs: PLANAR_DIRS,
    build: (c) => push(c, (c.spec.dir as PlanarDir | undefined) ?? "left", c.ease("inOut"), c.spec.blur),
  },
  pushUp: {
    description: "push with dir up: the incoming scene pushes up from below. Lists, feeds, 9:16.",
    duration: 0.5,
    range: [0.3, 0.8],
    params: ["ease", "blur", "layers"],
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
  pixels: {
    description:
      "Energetic register. A digital cut through the canvas: square cells (a 24th of the frame's long side) of the canvas colour dissolve over the outgoing scene in an ordered dither, then the incoming scene appears through the same dither, both sweeping in the direction of travel (dir, default right). No frame mixes two scenes' type. The product loads, a machine takes over.",
    duration: 0.5,
    range: [0.3, 0.8],
    params: ["ease", "dir"],
    dirs: PLANAR_DIRS,
    registers: ["energetic"],
    layers: { reveal: true, fx: () => ({ style: "position:absolute;inset:0;background:var(--color-canvas)", inner: "" }) },
    build: (c) => {
      const cell = Math.max(c.frame.width, c.frame.height) / PIXEL_CELLS;
      const fx: FxSpec = { kind: "pixels", angle: DIR_ANGLE[(c.spec.dir as PlanarDir | undefined) ?? "right"], cols: Math.round(c.frame.width / cell), rows: r3(c.frame.height / cell) };
      const e = c.ease("linear");
      const h = r3(c.d / 2);
      return {
        // At the midpoint the frame is all canvas: the outgoing scene and the covering cells step off together.
        out: [tw(`${c.out}.scene`, c.os, h, { opacity: [null, 0] }, STEP)],
        in: [
          tw(`${c.into}.fx`, 0, h, { fx: [0, 1] }, e, fx),
          tw(`${c.into}.fx`, 0, h, { opacity: [1, 0] }, STEP),
          tw(`${c.into}.reveal`, h, h, { fx: [0, 1] }, e, fx),
        ],
      };
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
  portal: {
    description:
      "The camera goes through an element. dir in (default): the outgoing scene grows until via (one of its elements: a card, a screen, a button) fills the frame, and the incoming scene is what was inside it, opening from the element's rounded rect. dir out: the outgoing scene shrinks into via, an element of the incoming scene (a pull-back to the screen it was playing on). The two scenes move as one rig, measured, so the window stays locked to the element.",
    duration: 0.8,
    range: [0.5, 1.4],
    params: ["ease", "dir", "via"],
    dirs: ["in", "out"],
    layers: { under: (spec) => spec.dir === "out" },
    build: portal,
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
  elements: TransitionElements = { out: [], in: [] },
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
    elements,
    ease: (fallback) => override ?? (typeof fallback === "string" ? named(fallback) : { spec: fallback }),
  });
}

/** Whether a transition is a cut (plain or matched): the scenes it joins do not overlap. */
export function isCut(t: { type: TransitionType }): boolean {
  return t.type === "cut" || Boolean(TRANSITION_DEFS[t.type].cut);
}
