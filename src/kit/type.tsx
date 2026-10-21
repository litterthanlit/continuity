/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from "preact";
import { formatCounter } from "../motion/evaluate.js";
import type { TypeSize } from "../themes/kits.js";
import { ctId } from "./context.js";
import { cx, type BaseProps } from "./core.js";

export type { TypeSize };

interface TextProps extends BaseProps {
  as?: string;
  size?: TypeSize;
  /** Balance line lengths (default true for display and titles). */
  balance?: boolean;
}

function Text({ ct, as = "p", size = "body", class: cls, style, children, balance }: TextProps) {
  const Tag = as as unknown as (p: Record<string, unknown>) => JSX.Element;
  return (
    <Tag data-ct={ct ? ctId(ct) : undefined} class={cx(`text-${size}`, balance && "text-balance", cls)} style={style}>
      {children}
    </Tag>
  );
}

/*
 * litt's type at video scale (docs/decisions/0006). Rank comes from weight and
 * the two inks first, then space, and only then from the one size step: a 500
 * title in fg over 400 text in the grey. Labels are 600, sentence case.
 */

/** The scene's one statement: the display step, 500, fg. One per scene. */
export function Headline({ size = "display", as = "h1", class: cls, balance = true, ...rest }: TextProps) {
  return <Text {...rest} as={as} size={size} balance={balance} class={cx("font-display text-fg", cls)} />;
}

/** A title: the title step at the title weight (500), fg. Feature names, a lockup's title. */
export function Title({ size = "title", as = "h2", class: cls, balance = true, ...rest }: TextProps) {
  return <Text {...rest} as={as} size={size} balance={balance} class={cx("font-sans font-title text-fg", cls)} />;
}

/** Supporting text: 400 in the grey. */
export function Body({ size = "body", as = "p", class: cls, ...rest }: TextProps) {
  return <Text {...rest} as={as} size={size} class={cx("font-sans text-fg-muted", cls)} />;
}

/** Small supporting text and meta: the small step, 400, in the grey. */
export function Caption({ size = "small", as = "p", class: cls, ...rest }: TextProps) {
  return <Text {...rest} as={as} size={size} class={cx("font-sans text-fg-subtle", cls)} />;
}

/** A label 8px above its title: the label step at 600, in the grey, sentence case. Not an uppercase mono eyebrow. */
export function Label({ size = "label", as = "p", class: cls, ...rest }: TextProps) {
  return <Text {...rest} as={as} size={size} class={cx("font-sans font-label text-fg-subtle", cls)} />;
}

/**
 * Keep copy in the storyboard while treating one word/phrase of it on its own:
 * `<Emph text={text.l2} word="see">{(w) => <El as="span" ct="see" class="text-fg">{w}</El>}</Emph>`
 * (litt: by ink — the key word in fg, the rest in the grey — never an accent colour or italic).
 */
export function Emph({ text, word, children }: { text: string; word: string; children: (w: string) => ComponentChildren }) {
  const i = text.indexOf(word);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      {children(word)}
      {text.slice(i + word.length)}
    </>
  );
}

/**
 * Text that shrinks to fit its container width at load (deterministic, after
 * fonts load). For variable data in fixed layouts — never to fit more copy.
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
