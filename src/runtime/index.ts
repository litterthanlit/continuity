/**
 * Continuity motion runtime (runs in the composition page).
 *
 * - Waits for every declared font face, then fits [data-ct-fit] text and
 *   splits [data-ct-split] text into chars/words/lines (deterministic: same
 *   fonts + same browser → same parts).
 * - Registers one HyperFrames frame source per scene. Each frame, the scene's
 *   timeline is evaluated as a pure function of scene-local time and written
 *   to inline styles. No GSAP, no WAAPI, no wall clock.
 * - Without HyperFrames (plain browser / probe), exposes `window.__ct.seek(t)`.
 *
 * NOTE: avoid template literals in this file's output — the HyperFrames bundler
 * rejects interpolated selectors; esbuild is configured to lower them anyway.
 */
import { compileScene, mergeVariationSettings, sampleScene, styleOf, type CompiledScene } from "../motion/evaluate.js";
import { morphAt, toPathD, type MorphData } from "../motion/morph.js";
import type { PartCounts, PropRange, SplitMode, Timeline } from "../motion/types.js";
import type { GlHandle } from "../gl/runtime.js";
import type { GlSpec } from "../gl/spec.js";
import { prepareCarriers, renderCarrier, type Carrier } from "./carriers.js";
import { drawGradients, mountGradients } from "./gradient.js";

interface CtData {
  timeline: Timeline;
  /** CSS font shorthands to preload, e.g. `normal 400 1em "Geist"`. */
  fonts: string[];
}

interface FrameSourceOptions {
  element: Element;
  ready?: Promise<unknown>;
  render: (t: number, signal?: AbortSignal) => void | Promise<void>;
  dispose?: () => void;
}

interface CtApi {
  ready: Promise<void>;
  seek: (t: number) => void;
  timeline: Timeline;
  parts: PartCounts;
  compiled: Map<string, CompiledScene>;
  apply: (scene: string, t: number) => void;
}

declare global {
  interface Window {
    __CT__?: CtData;
    __hyperframes?: { registerFrameSource?: (o: FrameSourceOptions) => () => void };
    __ct?: CtApi;
  }
}

const data = window.__CT__ as CtData;
const byId = new Map<string, HTMLElement>();
const sceneEls = new Map<string, HTMLElement>();
const partEls = new Map<string, HTMLElement[]>();
const partCounts: PartCounts = {};
const compiled = new Map<string, CompiledScene>();
/** Settled font-variation-settings of elements whose axes animate (kit axes such as WONK survive). */
const variationBase = new Map<HTMLElement, string>();
/** Per-element SVG filters for directional motion blur (created once, in compiled order). */
const motionBlurs = new Map<HTMLElement, { id: string; node: SVGFEGaussianBlurElement }>();
/** Shared-element carriers of morph transitions, measured once at prepare. */
let carriers = new Map<HTMLElement, Carrier>();
/** GL shots (continuity-gl.js): which shot answers each GL target id, and each scene's shots. */
const glTargets = new Map<string, GlHandle>();
const glScenes = new Map<string, GlHandle[]>();
/** Each scene's global start: gradient fields are drawn at global time (docs/decisions/0011). */
const sceneStarts = new Map(data.timeline.scenes.map((s) => [s.scene, s.start]));
/** `<Morph>` shapes: their outlines, aligned at build time. */
const morphs = new Map<Element, { path: SVGPathElement; data: MorphData }>();

function collect() {
  document.querySelectorAll<HTMLElement>("[data-ct]").forEach((el) => {
    byId.set(el.getAttribute("data-ct") as string, el);
  });
  document.querySelectorAll<HTMLElement>("[data-ct-scene]").forEach((el) => {
    sceneEls.set(el.getAttribute("data-ct-scene") as string, el);
  });
}

async function loadFonts() {
  const fs = document.fonts;
  if (!fs) return;
  await Promise.all(data.fonts.map((f) => fs.load(f).catch(() => [])));
  await fs.ready;
}

// ---------------------------------------------------------------- fit text

function fitAll() {
  document.querySelectorAll<HTMLElement>("[data-ct-fit]").forEach((el) => {
    const [minS, maxS] = (el.getAttribute("data-ct-fit") || "24,220").split(",").map(Number);
    const fits = () => el.scrollWidth <= el.clientWidth + 0.5;
    let lo = minS;
    let hi = maxS;
    el.style.fontSize = hi + "px";
    if (fits()) return;
    for (let i = 0; i < 14 && hi - lo > 0.5; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + "px";
      if (fits()) lo = mid;
      else hi = mid;
    }
    el.style.fontSize = Math.floor(lo * 2) / 2 + "px";
  });
}

// ---------------------------------------------------------------- split text

const graphemeSeg =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

function graphemes(s: string): string[] {
  if (graphemeSeg) return Array.from(graphemeSeg.segment(s), (x) => x.segment);
  return Array.from(s);
}

function span(cls: string, display: string): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = cls;
  s.style.display = display;
  return s;
}

/** Overflow mask around a part; padding keeps ascenders/descenders unclipped without moving layout. */
function masked(inner: HTMLElement, display: string): HTMLElement {
  const m = span("ct-m", display);
  m.style.overflow = "hidden";
  m.style.verticalAlign = "top";
  m.style.padding = "0.1em 0.04em 0.16em";
  m.style.margin = "-0.1em -0.04em -0.16em";
  m.appendChild(inner);
  return m;
}

function textNodesUnder(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const walk = (n: Node) => {
    n.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) out.push(c as Text);
      else if (c.nodeType === Node.ELEMENT_NODE && !(c as HTMLElement).hasAttribute("data-ct-nosplit")) walk(c);
    });
  };
  walk(root);
  return out;
}

function splitWordsOrChars(root: HTMLElement, mode: "words" | "chars", mask: boolean, out: HTMLElement[]) {
  for (const node of textNodesUnder(root)) {
    const text = node.data;
    if (!text.trim()) continue;
    const frag = document.createDocumentFragment();
    for (const token of text.split(/(\s+)/)) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        frag.appendChild(document.createTextNode(token));
        continue;
      }
      const w = span("ct-w", "inline-block");
      if (mode === "chars") {
        w.style.whiteSpace = "nowrap";
        for (const g of graphemes(token)) {
          const c = span("ct-c", "inline-block");
          c.textContent = g;
          w.appendChild(mask ? masked(c, "inline-block") : c);
          out.push(c);
        }
        frag.appendChild(w);
      } else if (mask) {
        w.textContent = token;
        frag.appendChild(masked(w, "inline-block"));
        out.push(w);
      } else {
        w.textContent = token;
        frag.appendChild(w);
        out.push(w);
      }
    }
    node.replaceWith(frag);
  }
}

function splitLines(root: HTMLElement, mask: boolean, out: HTMLElement[]) {
  const words: HTMLElement[] = [];
  splitWordsOrChars(root, "words", false, words);
  // Group top-level atoms (word spans, nested inline elements, whitespace) by their line.
  const atoms = Array.from(root.childNodes);
  const lines: Node[][] = [];
  let lastTop: number | null = null;
  const lh = parseFloat(getComputedStyle(root).lineHeight) || parseFloat(getComputedStyle(root).fontSize) || 16;
  for (const a of atoms) {
    if (a.nodeType !== Node.ELEMENT_NODE) {
      if (lines.length) lines[lines.length - 1].push(a);
      continue;
    }
    const top = (a as HTMLElement).getBoundingClientRect().top;
    if (lastTop === null || Math.abs(top - lastTop) > lh * 0.5) {
      lines.push([]);
      lastTop = top;
    }
    lines[lines.length - 1].push(a);
  }
  for (const group of lines) {
    const line = span("ct-l", "block");
    let target: HTMLElement = line;
    if (mask) {
      const inner = span("ct-li", "block");
      line.style.overflow = "hidden";
      line.style.padding = "0.1em 0 0.16em";
      line.style.margin = "-0.1em 0 -0.16em";
      line.appendChild(inner);
      target = inner;
    }
    root.insertBefore(line, group[0]);
    for (const n of group) target.appendChild(n);
    out.push(target);
  }
}

function splitAll() {
  document.querySelectorAll<HTMLElement>("[data-ct-split]").forEach((el) => {
    const id = el.getAttribute("data-ct") as string;
    const mode = el.getAttribute("data-ct-split") as SplitMode;
    const mask = el.hasAttribute("data-ct-mask");
    const out: HTMLElement[] = [];
    if (mode === "lines") splitLines(el, mask, out);
    else splitWordsOrChars(el, mode, mask, out);
    partEls.set(id, out);
    partCounts[id] = { [mode]: out.length };
  });
}

// ---------------------------------------------------------------- apply

function resolveKey(key: string): HTMLElement | undefined {
  const i = key.indexOf("::");
  if (i < 0) return byId.get(key);
  const list = partEls.get(key.slice(0, i));
  return list ? list[Number(key.slice(i + 2))] : undefined;
}

function apply(sceneId: string, t: number) {
  const c = compiled.get(sceneId);
  if (!c) return;
  sampleScene(c, t).forEach((v, key) => {
    const gl = glTargets.get(key);
    if (gl) {
      gl.set(key, v);
      return;
    }
    const el = resolveKey(key);
    if (!el) return;
    const s = styleOf(v, c.counters.get(key), c.fx.get(key), c.tapes.get(key));
    const st = el.style;
    if (s.transform !== undefined) st.transform = s.transform;
    if (s.opacity !== undefined) st.opacity = s.opacity;
    if (s.motionBlur !== undefined) {
      const mb = motionBlurs.get(el);
      const [bx, by] = s.motionBlur;
      // Below a twentieth of a pixel there is nothing to see: skip the offscreen filter pass.
      if (mb && (bx >= 0.05 || by >= 0.05)) {
        mb.node.setAttribute("stdDeviation", bx.toFixed(2) + " " + by.toFixed(2));
        st.filter = "url(#" + mb.id + ")" + (s.filter ? " " + s.filter : "");
      } else st.filter = s.filter ?? "";
    } else if (s.filter !== undefined) st.filter = s.filter;
    if (s.clipPath !== undefined) st.clipPath = s.clipPath;
    if (s.maskImage !== undefined) {
      st.maskImage = s.maskImage;
      st.setProperty("-webkit-mask-image", s.maskImage);
    }
    if (s.letterSpacing !== undefined) st.letterSpacing = s.letterSpacing;
    if (s.color !== undefined) st.color = s.color;
    if (s.strokeDashoffset !== undefined) st.strokeDashoffset = s.strokeDashoffset;
    if (s.borderRadius !== undefined) st.borderRadius = s.borderRadius;
    if (s.text !== undefined && el.textContent !== s.text) el.textContent = s.text;
    if (s.fontWeight !== undefined) st.fontWeight = s.fontWeight;
    if (s.fontStretch !== undefined) st.fontStretch = s.fontStretch;
    if (s.fontVariation !== undefined) st.fontVariationSettings = mergeVariationSettings(variationBase.get(el) ?? "normal", s.fontVariation);
    if (v.morph !== undefined) {
      const m = morphs.get(el);
      if (m) m.path.setAttribute("d", toPathD(morphAt(m.data, v.morph)));
    }
    if (v.match !== undefined) {
      const car = carriers.get(el);
      if (car) renderCarrier(car, v.match, t);
    }
  });
  glScenes.get(sceneId)?.forEach((h) => h.render());
  drawGradients(sceneId, (sceneStarts.get(sceneId) ?? 0) + t);
}

/** Mount every GL shot (fonts are loaded: plane textures draw type). */
function mountGl() {
  const api = (window as unknown as { __ctGl?: { mount: (c: HTMLCanvasElement, s: GlSpec) => GlHandle } }).__ctGl;
  document.querySelectorAll<HTMLCanvasElement>("canvas[data-ct-gl]").forEach((canvas) => {
    if (!api) throw new Error("continuity-gl.js did not load: a <Gl> shot cannot render");
    const spec = JSON.parse(canvas.getAttribute("data-ct-gl") as string) as GlSpec;
    const handle = api.mount(canvas, spec);
    const scene = spec.id.slice(0, spec.id.indexOf("."));
    glScenes.set(scene, [...(glScenes.get(scene) ?? []), handle]);
    for (const id of handle.ids) glTargets.set(id, handle);
  });
}

function collectMorphs() {
  document.querySelectorAll<SVGElement>("[data-ct-morph]").forEach((el) => {
    const path = el.querySelector("path");
    if (path) morphs.set(el, { path, data: JSON.parse(el.getAttribute("data-ct-morph") as string) as MorphData });
  });
}

/** One hidden SVG holding a blur filter per motion-blurred element, in compiled (deterministic) order. */
function createMotionBlurs() {
  let svg: SVGSVGElement | null = null;
  const NS = "http://www.w3.org/2000/svg";
  compiled.forEach((c) => {
    c.channels.forEach((byProp, key) => {
      const shutter = c.shutter.has(key);
      if (!byProp.has("blurX") && !byProp.has("blurY") && !shutter) return;
      const el = resolveKey(key);
      if (!el || motionBlurs.has(el)) return;
      if (!svg) {
        svg = document.createElementNS(NS, "svg");
        svg.setAttribute("width", "0");
        svg.setAttribute("height", "0");
        svg.setAttribute("aria-hidden", "true");
        svg.style.position = "absolute";
        document.body.appendChild(svg);
      }
      const id = "ct-mb-" + motionBlurs.size;
      const filter = document.createElementNS(NS, "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("color-interpolation-filters", "sRGB");
      // A full-frame scene smears its own edge pixels (no transparent fringe showing the
      // other scene); any other element gets room for the streak on its blurred axis.
      const frame = el.classList.contains("ct-scene");
      const x = (byProp.has("blurX") || shutter) && !frame;
      const y = (byProp.has("blurY") || shutter) && !frame;
      filter.setAttribute("x", x ? "-15%" : "0%");
      filter.setAttribute("width", x ? "130%" : "100%");
      filter.setAttribute("y", y ? "-15%" : "0%");
      filter.setAttribute("height", y ? "130%" : "100%");
      const node = document.createElementNS(NS, "feGaussianBlur");
      node.setAttribute("stdDeviation", "0 0");
      node.setAttribute("edgeMode", frame ? "duplicate" : "none");
      filter.appendChild(node);
      (svg as SVGSVGElement).appendChild(filter);
      motionBlurs.set(el, { id, node });
    });
  });
}

/** Read each axis-animated element's settled variation settings before any inline style is written. */
function captureVariationBases() {
  compiled.forEach((c) => {
    c.channels.forEach((byProp, key) => {
      if (!byProp.has("opsz") && !byProp.has("soft")) return;
      const el = resolveKey(key);
      if (el && !variationBase.has(el)) variationBase.set(el, getComputedStyle(el).fontVariationSettings);
    });
  });
}

/** An element's box in frame pixels. */
function frameRect(el: Element): { x: number; y: number; w: number; h: number } {
  const root = document.querySelector<HTMLElement>("[data-composition-id]") ?? document.body;
  const rb = root.getBoundingClientRect();
  const k = data.timeline.width / (rb.width || data.timeline.width);
  const r = el.getBoundingClientRect();
  return { x: (r.left - rb.left) * k, y: (r.top - rb.top) * k, w: r.width * k, h: r.height * k };
}

/**
 * Tweens whose values depend on layout (`measure`): measured once here, with the scenes laid out,
 * and written into the timeline, so every frame after is a pure function of time as usual.
 * focus: the camera move that makes the target fill `fill` of the frame at the move's end, its pan
 * clamped so the scene's edge never shows. match: the paired element starts at its partner's place
 * and size on the outgoing scene's last frame.
 */
function resolveMeasured() {
  const W = data.timeline.width;
  const H = data.timeline.height;
  const r4 = (n: number) => Math.round(n * 10000) / 10000;
  const byScene = new Map(data.timeline.scenes.map((s) => [s.scene, s]));
  for (const sc of data.timeline.scenes) {
    let changed = false;
    for (const t of sc.tweens) {
      const m = t.measure;
      if (!m) continue;
      if (m.kind === "focus") {
        const el = document.querySelector(`[data-ct="${m.target}"]`);
        const cam = document.querySelector<HTMLElement>(`[data-ct="${sc.scene}.camera"]`);
        if (!el || !cam) continue;
        apply(sc.scene, t.start + t.duration);
        const keep = cam.style.transform;
        cam.style.transform = "none";
        const r = frameRect(el);
        cam.style.transform = keep;
        const s = Math.max(1, m.fill * Math.min(W / Math.max(1, r.w), H / Math.max(1, r.h)));
        const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));
        const x = clamp(-s * (r.x + r.w / 2 - W / 2), ((s - 1) * W) / 2);
        const y = clamp(-s * (r.y + r.h / 2 - H / 2), ((s - 1) * H) / 2);
        t.props = { ...t.props, scale: [t.props.scale?.[0] ?? null, r4(s)], x: [t.props.x?.[0] ?? null, r4(x)], y: [t.props.y?.[0] ?? null, r4(y)] };
        changed = true;
      } else if (m.kind === "portal") {
        const via = document.querySelector<HTMLElement>(`[data-ct="${m.via}"]`);
        const viaScene = byScene.get(m.via.slice(0, m.via.indexOf(".")));
        if (!via || !viaScene) continue;
        apply(viaScene.scene, m.at);
        const A = frameRect(via);
        if (A.w < 1 || A.h < 1) continue;
        // Corner radius in frame px (the element is drawn at the scale of everything above it).
        const k = via.offsetWidth ? A.w / via.offsetWidth : 1;
        const radius = (parseFloat(getComputedStyle(via).borderTopLeftRadius) || 0) * k;
        const cx = A.x + A.w / 2 - W / 2;
        const cy = A.y + A.h / 2 - H / 2;
        // outer: the scale at which via covers the frame; inner: the scale at which the frame covers via.
        const grow = Math.max(W / A.w, H / A.h);
        const fit = Math.max(A.w / W, A.h / H);
        // The rig moves between the identity and the measured pose: inner starts measured going in, outer ends there.
        const fromPose = (m.role === "inner") === (m.dir === "in");
        const span = (v: number, rest: number): PropRange => (fromPose ? [r4(v), rest] : [rest, r4(v)]);
        if (m.role === "outer") {
          t.props = { ...t.props, scale: span(grow, 1), x: span(-grow * cx, 0), y: span(-grow * cy, 0) };
        } else {
          const ix = ((1 - A.w / (fit * W)) / 2) * 100;
          const iy = ((1 - A.h / (fit * H)) / 2) * 100;
          t.props = {
            ...t.props,
            scale: span(fit, 1),
            x: span(cx, 0),
            y: span(cy, 0),
            clipTop: span(iy, 0),
            clipBottom: span(iy, 0),
            clipLeft: span(ix, 0),
            clipRight: span(ix, 0),
            clipRound: span(radius / fit, 0),
          };
        }
        changed = true;
      } else {
        const outScene = byScene.get(m.from.slice(0, m.from.indexOf(".")));
        const a = document.querySelector(`[data-ct="${m.from}"]`);
        const b = document.querySelector<HTMLElement>(`[data-ct="${t.target}"]`);
        if (!outScene || !a || !b) continue;
        apply(outScene.scene, outScene.duration);
        const A = frameRect(a);
        apply(sc.scene, t.start);
        const B = frameRect(b);
        // B's box is drawn at the scale of everything above it (the camera too): offsets are in its own px.
        const k = b.offsetWidth ? B.w / b.offsetWidth : 1;
        const s = Math.sqrt((A.w * A.h) / Math.max(1, B.w * B.h));
        t.props = { x: [r4((A.x + A.w / 2 - (B.x + B.w / 2)) / k), 0], y: [r4((A.y + A.h / 2 - (B.y + B.h / 2)) / k), 0], scale: [r4(s), 1] };
        changed = true;
      }
    }
    if (changed) compiled.set(sc.scene, compileScene(sc, partCounts, data.timeline.fps));
  }
}

async function prepare() {
  collect();
  await loadFonts();
  // Measure with every scene laid out, whatever visibility the host applied.
  document.documentElement.classList.add("ct-measuring");
  try {
    fitAll();
    splitAll();
  } finally {
    document.documentElement.classList.remove("ct-measuring");
  }
  for (const s of data.timeline.scenes) compiled.set(s.scene, compileScene(s, partCounts, data.timeline.fps));
  document.documentElement.classList.add("ct-measuring");
  try {
    resolveMeasured();
  } finally {
    document.documentElement.classList.remove("ct-measuring");
  }
  captureVariationBases();
  createMotionBlurs();
  collectMorphs();
  mountGl();
  mountGradients();
  const root = document.querySelector<HTMLElement>("[data-composition-id]");
  if (root && root.querySelector("[data-ct-match]")) {
    document.documentElement.classList.add("ct-measuring");
    try {
      carriers = prepareCarriers({ byId, compiled, apply, root });
    } finally {
      document.documentElement.classList.remove("ct-measuring");
    }
  }
  // Paint the first frame of every scene so nothing flashes in its final state.
  for (const s of data.timeline.scenes) apply(s.scene, 0);
}

const ready = prepare();

function standaloneSeek(t: number) {
  const scenes = data.timeline.scenes;
  scenes.forEach((s, i) => {
    const el = sceneEls.get(s.scene);
    const local = t - s.start;
    const last = i === scenes.length - 1;
    const visible = local >= 0 && (local < s.duration || (last && local <= s.duration));
    if (el) el.style.visibility = visible ? "visible" : "hidden";
    if (visible) apply(s.scene, Math.min(local, s.duration));
  });
}

// `prepare()` ran `collect()` synchronously before its first await, so scenes are known here.
const hf = window.__hyperframes;
if (hf && hf.registerFrameSource) {
  sceneEls.forEach((el, id) => {
    hf.registerFrameSource!({
      element: el,
      ready,
      render: (t: number) => apply(id, t),
    });
  });
}

window.__ct = {
  ready,
  seek: standaloneSeek,
  timeline: data.timeline,
  parts: partCounts,
  compiled,
  apply,
};
