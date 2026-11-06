import type { ElementRole } from "../spec/storyboard.js";
import { staggers } from "./tokens.js";
import type { PlanarDir } from "./transitions.js";

/**
 * Layered handoffs: a planar join (push, pushUp, carry with `layers: true`) moves each top-level
 * element a little further than its scene, in a wave along the direction of travel — copy leads,
 * UI follows, decor trails. The plane carries the scene; the layers give it depth.
 */
export interface LayerElement {
  id: string;
  role: ElementRole;
  /** Storyboard anchor on the 6×6 grid ("A3", "D2:F5"); orders the wave. */
  anchor?: string;
}

export interface LayerStep {
  id: string;
  /** Share of LAYER_TRAVEL this element takes (by role). */
  depth: number;
  /** Seconds after the plane starts. */
  delay: number;
}

/** How far a depth-1 layer travels beyond its plane, as a share of the frame along the axis. */
export const LAYER_TRAVEL = 0.08;

/** Copy moves most and leads; UI follows; decor and media trail, nearly with the plane. */
export const LAYER_DEPTH: Record<ElementRole, number> = {
  headline: 1,
  title: 1,
  body: 1,
  label: 1,
  caption: 1,
  stat: 1,
  cta: 1,
  logo: 1,
  ui: 0.6,
  decor: 0.35,
  media: 0.35,
};

/** The last layer starts at most this share of the transition after the first. */
const LAYER_SPREAD = 0.3;

/** Columns (A–F) and rows (1–6) an anchor spans, 0-based. */
function span(anchor: string): { cols: [number, number]; rows: [number, number] } {
  const [a, b = a] = anchor.split(":");
  const col = (s: string) => s.charCodeAt(0) - 65;
  const row = (s: string) => Number(s.slice(1)) - 1;
  return {
    cols: [Math.min(col(a), col(b)), Math.max(col(a), col(b))],
    rows: [Math.min(row(a), row(b)), Math.max(row(a), row(b))],
  };
}

/**
 * Top-level elements in handoff order for a direction of travel, each with its depth (by role) and
 * delay. The wave runs from the leading edge: for `left`, column A first (by the element's leftmost
 * column); for `right`, F first (by its rightmost); `up` row 1 first; `down` row 6 first. Ties go
 * by the other axis (top/left first), then storyboard order; elements without an anchor go last.
 * Delays step by the list stagger, compressed so the last starts no later than 0.3·d.
 */
export function layerPlan(elements: LayerElement[], dir: PlanarDir, d: number): LayerStep[] {
  const horizontal = dir === "left" || dir === "right";
  const key = (e: LayerElement): [number, number] | undefined => {
    if (!e.anchor) return undefined;
    const { cols, rows } = span(e.anchor);
    const lead = dir === "left" ? cols[0] : dir === "right" ? -cols[1] : dir === "up" ? rows[0] : -rows[1];
    return [lead, horizontal ? rows[0] : cols[0]];
  };
  const ordered = elements
    .map((e, i) => ({ e, i, k: key(e) }))
    .sort((a, b) => {
      if (!a.k || !b.k) return (a.k ? 0 : 1) - (b.k ? 0 : 1) || a.i - b.i;
      return a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.i - b.i;
    });
  const step = ordered.length > 1 ? Math.min(staggers.list, (LAYER_SPREAD * d) / (ordered.length - 1)) : 0;
  return ordered.map(({ e }, i) => ({
    id: e.id,
    depth: LAYER_DEPTH[e.role],
    delay: Math.min(Math.round(i * step * 1e6) / 1e6, LAYER_SPREAD * d),
  }));
}
