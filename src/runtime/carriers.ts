/**
 * Shared-element carriers for the morph transition (docs/decisions/0008).
 *
 * A carrier lives in the incoming scene's overlay and holds clones of the two paired elements.
 * At prepare time each end of the cut is measured once — the outgoing element where the cut
 * starts, the incoming one where it lands, cameras and all — so every frame after that is a
 * pure function of the carrier's `match` channel: no layout is read while frames render.
 * Two shapes (`<Shape>` / `<Morph>`) morph their outline in frame space; anything else travels as
 * a pair of clones that cross-dissolve on the way.
 */
import { easeFn } from "../motion/easing.js";
import { deformation, type CompiledScene } from "../motion/evaluate.js";
import { mapContours, morphAt, parsePath, prepareContours, toPathD, type Contour, type MorphData } from "../motion/morph.js";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Side {
  box: HTMLElement;
  /** The original's own layout size (what the clone is laid out at). */
  lw: number;
  lh: number;
  rect: Rect;
}

interface ShapeCarrier {
  path: SVGPathElement;
  data: MorphData;
  fills: [number[], number[]];
}

export interface Carrier {
  el: HTMLElement;
  a: Side;
  b: Side;
  arc: number;
  squash: number;
  /** The carrier's own tween: progress → eased value, for the velocity squash reads. */
  start: number;
  duration: number;
  ease: (p: number) => number;
  shape?: ShapeCarrier;
}

export interface CarrierHost {
  byId: Map<string, HTMLElement>;
  compiled: Map<string, CompiledScene>;
  apply(scene: string, t: number): void;
  root: HTMLElement;
}

const INHERITED = ["color", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "fontFeatureSettings", "fontVariationSettings", "textAlign", "whiteSpace"] as const;

function layoutSize(el: Element): [number, number] {
  if (el instanceof HTMLElement) return [el.offsetWidth, el.offsetHeight];
  if (el instanceof SVGSVGElement) return [el.width.baseVal.value, el.height.baseVal.value];
  const r = el.getBoundingClientRect();
  return [r.width, r.height];
}

function rectIn(el: Element, root: DOMRect): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height };
}

/** The element's outline in frame px, through every transform between it and the root. */
function frameContours(svg: Element, root: DOMRect): Contour[] | undefined {
  const path = svg.querySelector("path");
  const m = path?.getScreenCTM();
  if (!path || !m) return undefined;
  return mapContours(parsePath(path.getAttribute("d") ?? ""), (x, y) => [m.a * x + m.c * y + m.e - root.left, m.b * x + m.d * y + m.f - root.top]);
}

function rgb(css: string): number[] {
  const m = /rgba?\(([^)]+)\)/.exec(css);
  return m ? m[1].split(/[,\s/]+/).filter(Boolean).slice(0, 3).map(Number) : [255, 255, 255];
}

export function prepareCarriers(host: CarrierHost): Map<HTMLElement, Carrier> {
  const out = new Map<HTMLElement, Carrier>();
  const root = host.root.getBoundingClientRect();
  host.root.querySelectorAll<HTMLElement>("[data-ct-match]").forEach((el) => {
    const id = el.getAttribute("data-ct") as string;
    const [aId, bId] = (el.getAttribute("data-ct-match") as string).split(" ");
    const A = host.byId.get(aId);
    const B = host.byId.get(bId);
    const into = host.compiled.get(id.slice(0, id.indexOf(".")));
    const from = host.compiled.get(aId.slice(0, aId.indexOf(".")));
    const tween = into?.resolved.find((r) => r.key === id && r.props.match);
    if (!A || !B || !into || !from || !tween) return;
    const os = Math.max(0, from.duration - tween.duration);
    host.apply(from.scene, os);
    const rectA = rectIn(A, root);
    const outlineA = A.hasAttribute("data-ct-shape") ? frameContours(A, root) : undefined;
    const end = tween.start + tween.duration;
    host.apply(into.scene, end);
    const rectB = rectIn(B, root);
    const outlineB = B.hasAttribute("data-ct-shape") ? frameContours(B, root) : undefined;
    const side = (s: "a" | "b", orig: Element, rect: Rect): Side => {
      const box = el.querySelector<HTMLElement>('[data-ct-side="' + s + '"]') as HTMLElement;
      const [lw, lh] = layoutSize(orig);
      const inherited = orig.parentElement ? getComputedStyle(orig.parentElement) : null;
      if (inherited) for (const p of INHERITED) box.style[p] = inherited[p];
      box.style.width = lw + "px";
      box.style.height = lh + "px";
      return { box, lw: Math.max(1, lw), lh: Math.max(1, lh), rect };
    };
    const c: Carrier = {
      el,
      a: side("a", A, rectA),
      b: side("b", B, rectB),
      arc: Number(el.getAttribute("data-ct-arc") ?? 0),
      squash: tween.squash ?? 0,
      start: tween.start,
      duration: tween.duration,
      ease: easeFn(tween.ease),
    };
    if (outlineA && outlineB) {
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", String(host.root.offsetWidth));
      svg.setAttribute("height", String(host.root.offsetHeight));
      // Clipped to the frame, never overflow: visible — see the note on Shape (kit/shape.tsx).
      svg.setAttribute("style", "position:absolute;left:0;top:0");
      const path = document.createElementNS(NS, "path");
      path.setAttribute("fill-rule", "evenodd");
      svg.appendChild(path);
      el.appendChild(svg);
      c.a.box.style.display = "none";
      c.b.box.style.display = "none";
      const fillOf = (x: Element) => rgb(getComputedStyle(x.querySelector("path") ?? x).fill);
      c.shape = { path, data: prepareContours([outlineA, outlineB]), fills: [fillOf(A), fillOf(B)] };
    }
    out.set(el, c);
  });
  return out;
}

const lerp = (a: number, b: number, e: number) => a + (b - a) * e;
const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const f3 = (n: number) => String(Math.round(n * 1000) / 1000);

/** Centre of the carrier at eased progress e: a straight line, bent by `arc` (a share of its length). */
function centre(c: Carrier, e: number): [number, number] {
  const ax = c.a.rect.x + c.a.rect.w / 2;
  const ay = c.a.rect.y + c.a.rect.h / 2;
  const bx = c.b.rect.x + c.b.rect.w / 2;
  const by = c.b.rect.y + c.b.rect.h / 2;
  const bend = c.arc * 4 * e * (1 - e);
  return [lerp(ax, bx, e) - (by - ay) * bend, lerp(ay, by, e) + (bx - ax) * bend];
}

function eased(c: Carrier, t: number): number {
  const p = c.duration > 0 ? (t - c.start) / c.duration : 1;
  return c.ease(Math.min(1, Math.max(0, p)));
}

/**
 * Place a carrier for eased progress `e` at scene time `t` (velocity, for squash, comes from its
 * tween). It hands over when its tween ends — by time, not value: a spring passes 1 mid-flight.
 */
export function renderCarrier(c: Carrier, e: number, t: number) {
  if (t >= c.start + c.duration - 1e-6) {
    c.el.style.visibility = "hidden";
    return;
  }
  // "inherit", never "visible": an explicit visible would show through its scene when the scene is hidden.
  c.el.style.visibility = "inherit";
  const [cx, cy] = centre(c, e);
  const D = c.squash ? deformation((u) => centre(c, eased(c, u)), t, c.squash) : [1, 0, 0, 1];
  const deform = "matrix(" + [D[0], D[2], D[1], D[3]].map(f3).join(",") + ",0,0)";
  if (c.shape) {
    const lin: [number, number] = [lerp(c.a.rect.x + c.a.rect.w / 2, c.b.rect.x + c.b.rect.w / 2, e), lerp(c.a.rect.y + c.a.rect.h / 2, c.b.rect.y + c.b.rect.h / 2, e)];
    const [dx, dy] = [cx - lin[0], cy - lin[1]];
    const shape = mapContours(morphAt(c.shape.data, e), (x, y) => [x + dx, y + dy]);
    c.shape.path.setAttribute("d", toPathD(shape));
    c.shape.path.setAttribute("transform", "translate(" + f3(cx) + " " + f3(cy) + ") " + deform.replace(/,/g, " ") + " translate(" + f3(-cx) + " " + f3(-cy) + ")");
    const [fa, fb] = c.shape.fills;
    c.shape.path.setAttribute("fill", "rgb(" + fa.map((v, i) => Math.round(lerp(v, fb[i], e))).join(",") + ")");
    return;
  }
  const w = lerp(c.a.rect.w, c.b.rect.w, e);
  const h = lerp(c.a.rect.h, c.b.rect.h, e);
  const x = smooth(0.2, 0.8, e);
  for (const [s, o] of [
    [c.a, 1 - x],
    [c.b, x],
  ] as Array<[Side, number]>) {
    s.box.style.transform =
      "translate(" + f3(cx) + "px," + f3(cy) + "px) " + deform + " translate(" + f3(-w / 2) + "px," + f3(-h / 2) + "px) scale(" + f3(w / s.lw) + "," + f3(h / s.lh) + ")";
    s.box.style.opacity = f3(o);
  }
}
