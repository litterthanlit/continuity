/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { textOutline } from "../build/outline.js";
import { boundsOf, mapContours, morphAt, parsePath, prepareMorph, toPathD, type MorphData } from "../motion/morph.js";
import { cx, type BaseProps } from "./core.js";
import { ctId } from "./context.js";

/**
 * Shapes clip to their viewBox (no `overflow: visible`): an unclipped SVG under a transform that
 * changes every frame (a camera push) rasterised a few edge pixels 2–4 levels differently
 * depending on what the same worker drew before — 145/150 frames byte-identical between 1 and 4
 * workers; clipped, 150/150. A Morph's viewBox is the union of its shapes' bounds, and every
 * in-between point lies inside it.
 */
interface ShapeBox {
  /** viewBox; defaults to the outline's own bounds. */
  viewBox?: string;
  /** Rendered size in px; one of them is enough (the other follows the viewBox's aspect). */
  width?: number;
  height?: number;
  /** Fill, a token colour: "var(--color-fg)" (default), "var(--color-accent)"… */
  fill?: string;
}

function box(viewBox: string, width?: number, height?: number): { w: number; h: number } {
  const [, , vw, vh] = viewBox.split(/[\s,]+/).map(Number);
  if (width && height) return { w: width, h: height };
  if (width) return { w: width, h: Math.round((width * vh) / vw) };
  if (height) return { w: Math.round((height * vw) / vh), h: height };
  return { w: vw, h: vh };
}

const fitBox = (d: string[]) => {
  const b = boundsOf(d.flatMap((p) => parsePath(p)));
  return `${r2(b.x)} ${r2(b.y)} ${r2(b.width)} ${r2(b.height)}`;
};

/**
 * A filled outline (a logo, a glyph run, a mark). Animate it like any element; as one side of a
 * `morph` transition pair it morphs its outline into the other side's.
 */
export function Shape({ ct, d, viewBox, width, height, fill = "var(--color-fg)", class: cls, style }: BaseProps & ShapeBox & { d: string }) {
  const vb = viewBox ?? fitBox([d]);
  const { w, h } = box(vb, width, height);
  return (
    <svg data-ct={ct ? ctId(ct) : undefined} data-ct-shape="" class={cx("block", cls)} style={style} width={w} height={h} viewBox={vb} aria-hidden="true">
      <path d={d} style={`fill:${fill}`} />
    </svg>
  );
}

/**
 * Shapes that morph into each other on the `morph` channel: 0 is the first, 1 the second…
 * (`m.tween("mark", { morph: [0, 1] }, { ease: "expressive" })`). Outlines are matched and
 * aligned at build time, so the frame only interpolates points.
 */
export function Morph({
  ct,
  shapes,
  samples,
  collapse,
  viewBox,
  width,
  height,
  fill = "var(--color-fg)",
  class: cls,
  style,
}: BaseProps & ShapeBox & { shapes: string[]; samples?: number; collapse?: "in-place" | "into" }) {
  const data = prepareMorph(shapes, { samples, collapse });
  const vb = viewBox ?? fitBox(shapes);
  const { w, h } = box(vb, width, height);
  return (
    <svg
      data-ct={ct ? ctId(ct) : undefined}
      data-ct-shape=""
      data-ct-morph={JSON.stringify(compact(data))}
      class={cx("block", cls)}
      style={style}
      width={w}
      height={h}
      viewBox={vb}
      aria-hidden="true"
    >
      <path d={toPathD(morphAt(data, 0))} style={`fill:${fill}`} />
    </svg>
  );
}

/** Text as an outline path (Geist, laid out with kerning) — for a Shape or a Morph step: `textShape("Ship", { size: 112 })`. */
export function textShape(text: string, opts: { size: number; weight?: number; family?: "Geist" | "Geist Mono"; tracking?: number }): string {
  return textOutline(text, opts).d;
}

/** An outline scaled by `scale` about its origin, then moved by (x, y): to put a mark where a morph should land it. */
export function placeShape(d: string, opts: { x?: number; y?: number; scale?: number }): string {
  const k = opts.scale ?? 1;
  return toPathD(mapContours(parsePath(d), (x, y) => [x * k + (opts.x ?? 0), y * k + (opts.y ?? 0)]));
}

/** The outline's bounding box, in its own units. */
export function shapeBounds(d: string): { x: number; y: number; width: number; height: number } {
  return boundsOf(parsePath(d));
}

function compact(d: MorphData): MorphData {
  return { shapes: d.shapes.map((s) => s.map((c) => c.map(r2))) };
}

function r2(n: number): number {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}
