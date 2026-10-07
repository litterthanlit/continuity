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
 * default), so `<Eyebrow class="text-accent">` really is accent.
 */
const GROUPS: Array<[string, RegExp]> = [
  ["text-size", /^text-(mega|display|h1|h2|h3|lead|body|caption|micro|xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(px|rem|em)\])$/],
  ["text-align", /^text-(left|center|right|justify|start|end)$/],
  ["text-wrap", /^text-(balance|pretty|wrap|nowrap)$/],
  ["text-color", /^text-/],
  ["font-family", /^font-(display|sans|mono|serif)$/],
  ["font-weight", /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/],
  ["tracking", /^tracking-/],
  ["leading", /^leading-/],
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
  /** Background treatment; defaults to the theme's. */
  bg?: StageBackground | "none";
  /** Film grain strength 0..1 (false to disable). Defaults to the theme's. */
  grain?: number | false;
}

/**
 * The scene canvas: background + content layer + grain. Every scene view
 * starts with a Stage. Content is positioned absolutely inside it.
 * The background element is animatable as `bg` (e.g. `m.loop("bg", { scale: 0.03 }, { period: 8 })`).
 */
export function Stage({ bg, grain, class: cls, style, children }: StageProps) {
  const { theme } = useScene();
  const kind = bg ?? theme.background;
  const grainAmount = grain === false ? 0 : (grain ?? theme.grain);
  return (
    <div class="ct-stage absolute inset-0 overflow-hidden bg-bg text-fg font-sans" style={{ perspective: "1600px" }}>
      {kind !== "none" && <Backdrop kind={kind} />}
      <div class={cx("ct-content absolute inset-0", cls)} style={style}>
        {children}
      </div>
      {grainAmount > 0 && <Grain amount={grainAmount} />}
    </div>
  );
}

export function Backdrop({ kind, ct = "bg" }: { kind: StageBackground; ct?: string }) {
  const layers: Record<StageBackground, string> = {
    solid: "background: var(--color-bg);",
    aurora: [
      "background:",
      "radial-gradient(60% 45% at 18% 0%, color-mix(in oklab, var(--color-accent) 34%, transparent) 0%, transparent 70%),",
      "radial-gradient(50% 40% at 85% 8%, color-mix(in oklab, var(--color-accent-2) 22%, transparent) 0%, transparent 70%),",
      "radial-gradient(80% 60% at 50% 110%, color-mix(in oklab, var(--color-accent) 12%, transparent) 0%, transparent 70%),",
      "var(--color-bg);",
    ].join(""),
    spotlight:
      "background: radial-gradient(55% 50% at 50% 0%, color-mix(in oklab, var(--color-fg) 12%, transparent) 0%, transparent 75%), var(--color-bg);",
    grid: [
      "background:",
      "linear-gradient(color-mix(in oklab, var(--color-fg) 7%, transparent) 1px, transparent 1px) 0 0 / 80px 80px,",
      "linear-gradient(90deg, color-mix(in oklab, var(--color-fg) 7%, transparent) 1px, transparent 1px) 0 0 / 80px 80px,",
      "var(--color-bg);",
      "mask-image: radial-gradient(75% 70% at 50% 45%, #000 40%, transparent 100%);",
    ].join(""),
    dots: [
      "background:",
      "radial-gradient(color-mix(in oklab, var(--color-fg) 16%, transparent) 1.5px, transparent 1.6px) 0 0 / 36px 36px,",
      "var(--color-bg);",
      "mask-image: radial-gradient(70% 65% at 50% 45%, #000 35%, transparent 100%);",
    ].join(""),
    mesh: [
      "background:",
      "radial-gradient(45% 40% at 15% 20%, color-mix(in oklab, var(--color-accent) 70%, transparent) 0%, transparent 70%),",
      "radial-gradient(40% 40% at 85% 30%, color-mix(in oklab, var(--color-accent-2) 60%, transparent) 0%, transparent 70%),",
      "radial-gradient(50% 45% at 60% 95%, color-mix(in oklab, var(--color-accent) 45%, transparent) 0%, transparent 70%),",
      "var(--color-bg);",
    ].join(""),
  };
  // The grid/dots masks fade to transparent, so a solid underlay keeps the canvas opaque.
  return (
    <div class="ct-backdrop absolute inset-0 bg-bg" data-layout-ignore>
      <div data-ct={ctId(ct)} class="absolute -inset-[4%]" style={layers[kind]} />
    </div>
  );
}

/** Deterministic SVG fractal-noise grain overlay (no randomness at render time). */
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
        mixBlendMode: "overlay",
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

export function Center({ class: cls, style, children, ct }: BaseProps) {
  return (
    <div data-ct={ct ? ctId(ct) : undefined} class={cx("absolute inset-0 flex flex-col items-center justify-center text-center", cls)} style={style}>
      {children}
    </div>
  );
}

export function Stack({ class: cls, style, children, ct, gap = 24 }: BaseProps & { gap?: number }) {
  return (
    <div data-ct={ct ? ctId(ct) : undefined} class={cx("flex flex-col", cls)} style={[`gap:${gap}px`, typeof style === "string" ? style : ""].join(";")}>
      {children}
    </div>
  );
}

export function Row({ class: cls, style, children, ct, gap = 24 }: BaseProps & { gap?: number }) {
  return (
    <div data-ct={ct ? ctId(ct) : undefined} class={cx("flex flex-row items-center", cls)} style={[`gap:${gap}px`, typeof style === "string" ? style : ""].join(";")}>
      {children}
    </div>
  );
}

/** Soft colored light — a big blurred radial blob. Animate with loops for ambient life. */
export function Glow({
  ct,
  color = "accent",
  size = 900,
  x = "50%",
  y = "50%",
  opacity = 0.35,
}: { ct?: string; color?: "accent" | "accent-2" | "fg"; size?: number; x?: string; y?: string; opacity?: number }) {
  return (
    <div
      data-ct={ct ? ctId(ct) : undefined}
      data-layout-ignore
      class="pointer-events-none absolute rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: x,
        top: y,
        marginLeft: `${-size / 2}px`,
        marginTop: `${-size / 2}px`,
        background: `radial-gradient(closest-side, color-mix(in oklab, var(--color-${color}) ${Math.round(opacity * 100)}%, transparent), transparent)`,
      }}
    />
  );
}

/** SVG path that can be drawn on with the `draw` preset. */
export function Path({
  ct,
  d,
  viewBox,
  width,
  height,
  stroke = "var(--color-accent)",
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

/**
 * Light sweep across a surface (place inside a relative, overflow-hidden
 * parent). Animate: `m.tween("sheen", { xPct: [-160, 360] }, { duration: "linger", ease: "inOut" })`.
 */
export function Sheen({ ct, opacity = 0.14 }: { ct: string; opacity?: number }) {
  return (
    <div class="pointer-events-none absolute inset-0 overflow-hidden" data-layout-ignore>
      <div
        data-ct={ctId(ct)}
        class="absolute inset-y-[-20%] left-0 w-[38%]"
        style={{
          transform: "translate3d(0,0,0) translate(-160%,0)",
          // Stops at 18%/82%: an angled gradient isn't transparent along its own box
          // edges, which shows as hard vertical lines on tall surfaces.
          background: `linear-gradient(100deg, transparent 18%, rgba(255,255,255,${opacity}) 50%, transparent 82%)`,
        }}
      />
    </div>
  );
}
