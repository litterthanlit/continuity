import type { ComponentChildren, JSX } from "preact";
import { formatCounter } from "../motion/evaluate.js";
import { ctId, useScene } from "./context.js";
import { cx, type BaseProps } from "./core.js";

export type TypeSize = "mega" | "display" | "h1" | "h2" | "h3" | "lead" | "body" | "caption" | "micro";

interface TextProps extends BaseProps {
  as?: string;
  size?: TypeSize;
  /** Balance line lengths (default true for headlines). */
  balance?: boolean;
}

function Text({ ct, as = "p", size = "body", class: cls, style, children, balance }: TextProps & { base: string }) {
  const Tag = as as unknown as (p: Record<string, unknown>) => JSX.Element;
  return (
    <Tag data-ct={ct ? ctId(ct) : undefined} class={cx(`text-${size}`, balance && "text-balance", cls)} style={style}>
      {children}
    </Tag>
  );
}

/** Big display type in the theme's display face. Sizes: mega, display, h1, h2, h3. */
export function Headline({ size = "display", as = "h1", class: cls, balance = true, ...rest }: TextProps) {
  return <Text {...rest} base="" as={as} size={size} balance={balance} class={cx("font-display font-semibold text-fg", cls)} />;
}

/** Secondary line under a headline. */
export function Subhead({ size = "lead", as = "p", class: cls, balance = true, ...rest }: TextProps) {
  return <Text {...rest} base="" as={as} size={size} balance={balance} class={cx("font-sans text-muted", cls)} />;
}

export function Body({ size = "body", as = "p", class: cls, ...rest }: TextProps) {
  return <Text {...rest} base="" as={as} size={size} class={cx("font-sans text-muted", cls)} />;
}

/** Small uppercase mono label above a headline ("INTRODUCING", "01 — SPEED"). */
export function Eyebrow({ size, as = "p", class: cls, ...rest }: TextProps) {
  const s = size ?? (useScene().portrait ? "caption" : "micro");
  return <Text {...rest} base="" as={as} size={s} class={cx("font-mono uppercase tracking-[0.18em] text-subtle", cls)} />;
}

/** Small supporting text. Portrait (9:16) defaults one step larger for phone legibility. */
export function Caption({ size, as = "p", class: cls, ...rest }: TextProps) {
  const s = size ?? (useScene().portrait ? "body" : "caption");
  return <Text {...rest} base="" as={as} size={s} class={cx("font-sans text-subtle", cls)} />;
}

/** Inline accent-colored words inside a headline. */
export function Accent({ children, class: cls, ct }: { children: ComponentChildren; class?: string; ct?: string }) {
  return (
    <span data-ct={ct ? ctId(ct) : undefined} class={cx("text-accent", cls)}>
      {children}
    </span>
  );
}

/** Inline editorial italic serif accent ("Ship *beautiful* motion"). */
export function Serif({ children, class: cls, ct }: { children: ComponentChildren; class?: string; ct?: string }) {
  return (
    <span data-ct={ct ? ctId(ct) : undefined} class={cx("font-serif italic font-normal tracking-normal", cls)}>
      {children}
    </span>
  );
}

/** Gradient-filled text (accent → accent-2). */
export function GradientText({ children, class: cls, ct }: { children: ComponentChildren; class?: string; ct?: string }) {
  return (
    <span
      data-ct={ct ? ctId(ct) : undefined}
      class={cls}
      style="background:linear-gradient(100deg,var(--color-accent),var(--color-accent-2));-webkit-background-clip:text;background-clip:text;color:transparent"
    >
      {children}
    </span>
  );
}

/**
 * Text that shrinks to fit its container width at load (deterministic, after
 * fonts load). Use for long/variable copy in fixed layouts.
 */
export function Fit({ ct, as = "p", class: cls, max = 220, min = 24, children }: BaseProps & { as?: string; max?: number; min?: number }) {
  const Tag = as as unknown as (p: Record<string, unknown>) => JSX.Element;
  return (
    <Tag
      data-ct={ct ? ctId(ct) : undefined}
      data-ct-fit={`${min},${max}`}
      class={cx("whitespace-nowrap", cls)}
      style={`font-size:${max}px`}
    >
      {children}
    </Tag>
  );
}

/**
 * A number animated with `m.counter(ct, { to })`. Renders its starting value
 * statically; tabular figures keep width steady while counting.
 */
export function Counter({
  ct,
  from = 0,
  decimals = 0,
  prefix,
  suffix,
  separator = ",",
  class: cls,
}: { ct: string; from?: number; decimals?: number; prefix?: string; suffix?: string; separator?: string; class?: string }) {
  return (
    <span data-ct={ctId(ct)} class={cx("tabular-nums", cls)}>
      {formatCounter(from, { decimals, prefix, suffix, separator })}
    </span>
  );
}

/**
 * Words with a marker bar behind them. Animate the bar as `<ct>-bar` with
 * `m.emphasize("<ct>-bar", "underline", …)`.
 */
export function Highlight({ ct, children, class: cls, color = "accent" }: { ct: string; children: ComponentChildren; class?: string; color?: "accent" | "accent-2" }) {
  return (
    <span data-ct={ctId(ct)} class={cx("relative inline-block isolate", cls)}>
      <span
        data-ct={ctId(`${ct}-bar`)}
        data-layout-ignore
        class="absolute left-[-0.06em] right-[-0.06em] bottom-[0.06em] h-[0.38em] -z-10 rounded-[0.08em]"
        style={`background:color-mix(in oklab,var(--color-${color}) 55%,transparent);transform-origin:left center`}
      />
      <span class="relative">{children}</span>
    </span>
  );
}
