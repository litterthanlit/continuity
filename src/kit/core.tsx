/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type { ComponentChildren, CSSProperties, JSX } from "preact";
import type { StageBackground } from "../themes/index.js";
import { ctId, useScene } from "./context.js";

export type Style = CSSProperties | string;

export interface BaseProps {
  /** Element id inside the scene → `data-ct="<scene>.<ct>"`. Required for anything you animate. */
  ct?: string;
  class?: string;
  style?: Style;
  children?: ComponentChildren;
}

/**
 * Join classes; later classes override earlier ones in the same group (a tiny,
 * dependency-free tailwind-merge for the utilities kit components set by
 * default), so `<Label class="text-fg">` really is fg.
 */
const GROUPS: Array<[string, RegExp]> = [
  ["text-size", /^text-(display|title|body|small|label|xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(px|rem|em)\])$/],
  ["text-align", /^text-(left|center|right|justify|start|end)$/],
  ["text-wrap", /^text-(balance|pretty|wrap|nowrap)$/],
  ["text-color", /^text-/],
  ["font-family", /^font-(display|sans|mono)$/],
  ["font-weight", /^font-(normal|title|label|thin|extralight|light|medium|semibold|bold|extrabold|black|\[\d+\])$/],
  ["tracking", /^tracking-/],
  ["leading", /^leading-/],
  ["font-stretch", /^font-stretch-/],
  ["case", /^(uppercase|lowercase|capitalize|normal-case)$/],
  ["italic", /^(italic|not-italic)$/],
];
const groupOf = (c: string) => GROUPS.find(([, re]) => re.test(c.replace(/^[a-z-]+:/, "")))?.[0];

export function cx(...parts: Array<string | false | null | undefined>): string {
  const tokens = parts.filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
  const seen = new Map<string, number>();
  const out: Array<string | null> = [];
  for (const t of tokens) {
    const variant = t.includes(":") ? t.slice(0, t.lastIndexOf(":") + 1) : "";
    const g = groupOf(t);
    if (g) {
      const key = variant + g;
      const prev = seen.get(key);
      if (prev !== undefined) out[prev] = null;
      seen.set(key, out.length);
    }
    out.push(t);
  }
  return out.filter((t): t is string => t !== null).join(" ");
}

/** Any element, optionally animatable. `<El ct="card" as="section" class="...">`. */
export function El({
  ct,
  as = "div",
  class: cls,
  style,
  children,
  ...rest
}: BaseProps & { as?: string } & Record<string, unknown>) {
  const Tag = as as unknown as (p: Record<string, unknown>) => JSX.Element;
  return (
    <Tag data-ct={ct ? ctId(ct) : undefined} class={cls} style={style} {...rest}>
      {children}
    </Tag>
  );
}

export interface StageProps extends BaseProps {
  /** `solid` canvas (the default) or `lit`: litt's one light source, from the top. Use it on the hero, maybe the end card. */
  bg?: StageBackground | "none";
  /** Grain opacity 0..1 (false to disable). Defaults to the theme's (litt: 0.02 light, 0.04 dark). */
  grain?: number | false;
}

/**
 * The scene canvas: background + content layer + grain. Every scene view
 * starts with a Stage. Content is positioned absolutely inside it.
 * Material is static in litt (P5): the backdrop never animates.
 */
export function Stage({ bg, grain, class: cls, style, children }: StageProps) {
  const { theme } = useScene();
  const kind = bg ?? theme.background;
  const grainAmount = grain === false ? 0 : (grain ?? theme.material.grain);
  return (
    <div class="ct-stage absolute inset-0 overflow-hidden bg-canvas text-fg font-sans" style={{ perspective: "1600px" }}>
      {kind !== "none" && <Backdrop kind={kind} />}
      <div class={cx("ct-content absolute inset-0", cls)} style={style}>
        {children}
      </div>
      {grainAmount > 0 && <Grain amount={grainAmount} />}
    </div>
  );
}

export function Backdrop({ kind, ct = "bg" }: { kind: StageBackground; ct?: string }) {
  return (
    <div class="ct-backdrop absolute inset-0 bg-canvas" data-layout-ignore>
      <div data-ct={ctId(ct)} class={cx("absolute inset-0", kind === "lit" && "ct-lit")} />
    </div>
  );
}

/** litt's grain: a static SVG fractal-noise tile at plain opacity. It also dithers the light's banding. */
export function Grain({ amount }: { amount: number }) {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='7' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1 0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
  return (
    <div
      class="ct-grain pointer-events-none absolute inset-0"
      data-layout-ignore
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
        opacity: String(Math.min(1, Math.max(0, amount))),
      }}
    />
  );
}

export type SafeZone = "title" | "action" | "social" | "none";

/**
 * Content area inset to a safe zone:
 * - title  — 90% of the frame (EBU R95 / SMPTE ST 2046-1 title-safe)
 * - action — 93%
 * - social — 9:16 feed UI clearance (top 12%, bottom 20%, left 8%, right 14%)
 */
export function Safe({ zone = "title", class: cls, style, children, ct }: BaseProps & { zone?: SafeZone }) {
  const insets: Record<SafeZone, string> = {
    title: "5%",
    action: "3.5%",
    // 8% left (not 6%) leaves room for a camera push-in of up to ~5%.
    social: "12% 14% 20% 8%",
    none: "0",
  };
  return (
    <div data-ct={ct ? ctId(ct) : undefined} class={cx("absolute", cls)} style={[`inset:${insets[zone]}`, typeof style === "string" ? style : ""].join(";")}>
      {children}
    </div>
  );
}

/** Centered content. litt: only for one short statement (an end card, a quote), at most once per video. */
export function Center({ class: cls, style, children, ct }: BaseProps) {
  return (
    <div data-ct={ct ? ctId(ct) : undefined} class={cx("absolute inset-0 flex flex-col items-center justify-center text-center", cls)} style={style}>
      {children}
    </div>
  );
}

/**
 * A column. litt's text spacing at video scale: a label 8px above its title and a
 * title 8px above its text (a lockup reads as one unit), the display line 32px
 * above its summary, blocks 32px apart (the default), regions 96px apart.
 */
export function Stack({ class: cls, style, children, ct, gap = 32 }: BaseProps & { gap?: number }) {
  return (
    <div data-ct={ct ? ctId(ct) : undefined} class={cx("flex flex-col", cls)} style={[`gap:${gap}px`, typeof style === "string" ? style : ""].join(";")}>
      {children}
    </div>
  );
}

/** A row; blocks 32px apart by default. */
export function Row({ class: cls, style, children, ct, gap = 32 }: BaseProps & { gap?: number }) {
  return (
    <div data-ct={ct ? ctId(ct) : undefined} class={cx("flex flex-row items-center", cls)} style={[`gap:${gap}px`, typeof style === "string" ? style : ""].join(";")}>
      {children}
    </div>
  );
}

/** SVG path that can be drawn on with the `draw` preset (data: a trend, a connector). Strokes in fg by default. */
export function Path({
  ct,
  d,
  viewBox,
  width,
  height,
  stroke = "var(--color-fg)",
  strokeWidth = 4,
  class: cls,
}: { ct: string; d: string; viewBox: string; width: number; height: number; stroke?: string; strokeWidth?: number; class?: string }) {
  return (
    <svg class={cls} width={width} height={height} viewBox={viewBox} fill="none" data-layout-ignore>
      <path
        data-ct={ctId(ct)}
        d={d}
        pathLength={1}
        stroke={stroke}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
        style={{ strokeDasharray: "1", strokeDashoffset: "0" }}
      />
    </svg>
  );
}
