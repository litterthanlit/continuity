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
import { compileScene, sampleScene, styleOf, type CompiledScene } from "../motion/evaluate.js";
import type { PartCounts, SplitMode, Timeline } from "../motion/types.js";

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
    const el = resolveKey(key);
    if (!el) return;
    const s = styleOf(v, c.counters.get(key));
    const st = el.style;
    if (s.transform !== undefined) st.transform = s.transform;
    if (s.opacity !== undefined) st.opacity = s.opacity;
    if (s.filter !== undefined) st.filter = s.filter;
    if (s.clipPath !== undefined) st.clipPath = s.clipPath;
    if (s.letterSpacing !== undefined) st.letterSpacing = s.letterSpacing;
    if (s.strokeDashoffset !== undefined) st.strokeDashoffset = s.strokeDashoffset;
    if (s.text !== undefined && el.textContent !== s.text) el.textContent = s.text;
  });
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
  for (const s of data.timeline.scenes) compiled.set(s.scene, compileScene(s, partCounts));
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
