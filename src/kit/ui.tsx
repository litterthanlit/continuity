import type { ComponentChildren } from "preact";
import { ctId } from "./context.js";
import { cx, type Style } from "./core.js";

/**
 * Product UI kit, designed at VIDEO scale.
 *
 * Real interfaces use 13–16px text; in a 1080p video that is illegible. Motion
 * studios rebuild UI ~1.75× larger and simplified. Every component here keeps
 * text ≥ 26px and exposes sub-element ids (`<ct>-…`) so parts can be
 * choreographed (rows cascade, bars grow, a cursor clicks, text types).
 */

const id = (ct: string | undefined, suffix?: string) => (ct ? ctId(suffix ? `${ct}-${suffix}` : ct) : undefined);

interface Box {
  ct?: string;
  class?: string;
  style?: Style;
  children?: ComponentChildren;
}

// ---------------------------------------------------------------- frames

/** App window with traffic-light chrome. Body is `<ct>-body`. */
export function Window({
  ct,
  title,
  width = 1280,
  height = 760,
  class: cls,
  children,
  glass,
}: Box & { title?: string; width?: number; height?: number; glass?: boolean }) {
  return (
    <div
      data-ct={id(ct)} data-ct-ui
      class={cx(
        "relative overflow-hidden rounded-xl border border-border shadow-float",
        glass ? "bg-surface/70 backdrop-blur-2xl" : "bg-surface",
        cls,
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div class="flex h-[68px] items-center gap-[14px] border-b border-border bg-surface-2/70 px-[26px]">
        <span class="h-[18px] w-[18px] rounded-full bg-[#ff5f57]" />
        <span class="h-[18px] w-[18px] rounded-full bg-[#febc2e]" />
        <span class="h-[18px] w-[18px] rounded-full bg-[#28c840]" />
        {title && <span class="ml-[18px] font-sans text-[26px] font-medium text-muted">{title}</span>}
      </div>
      <div data-ct={id(ct, "body")} class="relative h-[calc(100%-68px)]">
        {children}
      </div>
    </div>
  );
}

/** Browser window with an address bar. */
export function Browser({ ct, url = "app.example.com", width = 1400, height = 820, class: cls, children }: Box & { url?: string; width?: number; height?: number }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("relative overflow-hidden rounded-xl border border-border bg-surface shadow-float", cls)} style={{ width: `${width}px`, height: `${height}px` }}>
      <div class="flex h-[76px] items-center gap-[14px] border-b border-border bg-surface-2/70 px-[26px]">
        <span class="h-[18px] w-[18px] rounded-full bg-[#ff5f57]" />
        <span class="h-[18px] w-[18px] rounded-full bg-[#febc2e]" />
        <span class="h-[18px] w-[18px] rounded-full bg-[#28c840]" />
        <div class="mx-auto flex h-[46px] w-[52%] items-center justify-center gap-[10px] rounded-full bg-bg/70 font-sans text-[26px] text-muted">
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none" data-layout-ignore>
            <rect x="2" y="9" width="14" height="10" rx="2" fill="currentColor" />
            <path d="M5 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.2" />
          </svg>
          <span data-ct={id(ct, "url")}>{url}</span>
        </div>
      </div>
      <div data-ct={id(ct, "body")} class="relative h-[calc(100%-76px)]">
        {children}
      </div>
    </div>
  );
}

/** Phone frame (portrait). Screen is `<ct>-screen`. */
export function Phone({ ct, width = 460, class: cls, children }: Box & { width?: number }) {
  const height = Math.round(width * 2.05);
  return (
    <div
      data-ct={id(ct)} data-ct-ui
      class={cx("relative rounded-[68px] border-[14px] border-[#1c1c20] bg-bg shadow-float", cls)}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div class="absolute left-1/2 top-[18px] z-10 h-[36px] w-[132px] -translate-x-1/2 rounded-full bg-black" />
      <div data-ct={id(ct, "screen")} class="absolute inset-0 overflow-hidden rounded-[54px]">
        {children}
      </div>
    </div>
  );
}

/** Surface card. `glow` adds an accent halo; `glass` a translucent panel. */
export function Card({ ct, class: cls, style, children, glow, glass }: Box & { glow?: boolean; glass?: boolean }) {
  return (
    <div
      data-ct={id(ct)} data-ct-ui
      class={cx(
        "relative rounded-lg border border-border p-[36px]",
        glass ? "bg-fg/[0.04] backdrop-blur-xl" : "bg-surface",
        glow && "shadow-glow",
        cls,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- controls

export function Button({ ct, children, variant = "primary", class: cls }: Box & { variant?: "primary" | "secondary" | "ghost" }) {
  const v = {
    primary: "bg-accent text-accent-fg",
    secondary: "bg-surface-2 text-fg border border-border",
    ghost: "text-fg",
  }[variant];
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("inline-flex h-[76px] items-center justify-center gap-[12px] rounded-full px-[40px] font-sans text-[30px] font-semibold", v, cls)}>
      {children}
    </div>
  );
}

export function Pill({ ct, children, class: cls, dot }: Box & { dot?: "accent" | "positive" | "warning" | "danger" }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("inline-flex h-[52px] items-center gap-[12px] rounded-full border border-border bg-surface-2 px-[22px] font-sans text-[26px] font-medium text-muted", cls)}>
      {dot && <span class={`h-[12px] w-[12px] rounded-full bg-${dot}`} />}
      {children}
    </div>
  );
}

export function Kbd({ ct, children, class: cls }: Box) {
  return (
    <span data-ct={id(ct)} class={cx("inline-flex h-[56px] min-w-[56px] items-center justify-center rounded-md border border-border border-b-[4px] bg-surface-2 px-[14px] font-mono text-[28px] text-fg", cls)}>
      {children}
    </span>
  );
}

/** Text field. Typed text is `<ct>-text` (animate with typeOn), caret is `<ct>-caret`. */
export function Input({ ct, value = "", placeholder, icon = true, class: cls, width = 760 }: Box & { value?: string; placeholder?: string; icon?: boolean; width?: number }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("flex h-[84px] items-center gap-[16px] rounded-lg border border-border bg-surface-2 px-[26px] font-sans text-[30px]", cls)} style={{ width: `${width}px` }}>
      {icon && (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" class="text-subtle" data-layout-ignore>
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.4" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
        </svg>
      )}
      <span class="relative flex items-center">
        {placeholder && !value && <span class="text-subtle">{placeholder}</span>}
        <span data-ct={id(ct, "text")} class="text-fg">
          {value}
        </span>
        <span data-ct={id(ct, "caret")} data-layout-ignore class="ml-[3px] inline-block h-[36px] w-[3px] bg-accent" />
      </span>
    </div>
  );
}

/** On/off switch. Animate `<ct>-knob` x 0→36 and `<ct>-on` opacity 0→1. */
export function Toggle({ ct, class: cls }: Box) {
  return (
    <div data-ct={id(ct)} class={cx("relative h-[48px] w-[84px] rounded-full bg-surface-2 border border-border", cls)}>
      <div data-ct={id(ct, "on")} class="absolute inset-0 rounded-full bg-accent" style={{ opacity: "0" }} />
      <div data-ct={id(ct, "knob")} class="absolute left-[5px] top-[5px] h-[36px] w-[36px] rounded-full bg-fg shadow-float" />
    </div>
  );
}

/** Progress bar. Animate `<ct>-fill` scaleX 0→value (origin left). */
export function Progress({ ct, value = 1, class: cls, width = 640 }: Box & { value?: number; width?: number }) {
  return (
    <div data-ct={id(ct)} class={cx("relative h-[14px] overflow-hidden rounded-full bg-surface-2", cls)} style={{ width: `${width}px` }}>
      <div data-ct={id(ct, "fill")} class="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.round(value * 100)}%`, transformOrigin: "left center" }} />
    </div>
  );
}

// ---------------------------------------------------------------- content

/** A notification. */
export function Toast({ ct, title, body, icon = "✓", class: cls }: Box & { title: string; body?: string; icon?: string }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("flex w-[620px] items-start gap-[20px] rounded-lg border border-border bg-surface-2 p-[26px] shadow-float", cls)}>
      <div class="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-accent font-sans text-[28px] font-bold text-accent-fg">{icon}</div>
      <div class="flex flex-col gap-[6px]">
        <div class="font-sans text-[30px] font-semibold text-fg">{title}</div>
        {body && <div class="font-sans text-[26px] text-muted">{body}</div>}
      </div>
    </div>
  );
}

export function Avatar({ ct, initials, class: cls, size = 64 }: Box & { initials: string; size?: number }) {
  return (
    <div
      data-ct={id(ct)}
      class={cx("flex items-center justify-center rounded-full font-sans font-semibold text-accent-fg", cls)}
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.42)}px`, background: "linear-gradient(135deg,var(--color-accent),var(--color-accent-2))" }}
    >
      {initials}
    </div>
  );
}

/** Sidebar navigation. Items are `<ct>-i0…`; `active` highlights one. */
export function Sidebar({ ct, items, active = 0, class: cls }: Box & { items: string[]; active?: number }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("flex h-full w-[300px] flex-col gap-[6px] border-r border-border bg-surface-2/50 p-[20px]", cls)}>
      {items.map((label, i) => (
        <div
          data-ct={id(ct, `i${i}`)}
          class={cx("flex h-[60px] items-center gap-[16px] rounded-md px-[18px] font-sans text-[26px]", i === active ? "bg-fg/[0.07] text-fg" : "text-muted")}
        >
          <span class={cx("h-[20px] w-[20px] rounded-[6px]", i === active ? "bg-accent" : "bg-fg/20")} />
          {label}
        </div>
      ))}
    </div>
  );
}

/** List rows (e.g. issues, tasks). Rows are `<ct>-r0…`. */
export function List({ ct, rows, class: cls }: Box & { rows: Array<{ title: string; meta?: string; status?: "accent" | "positive" | "warning" | "danger" }> }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("flex flex-col", cls)}>
      {rows.map((r, i) => (
        <div data-ct={id(ct, `r${i}`)} class="flex h-[78px] items-center gap-[20px] border-b border-border px-[28px]">
          <span class={cx("h-[18px] w-[18px] rounded-full border-[3px]", r.status ? `border-${r.status}` : "border-subtle")} />
          <span class="font-sans text-[28px] text-fg">{r.title}</span>
          {r.meta && <span class="ml-auto font-mono text-[26px] text-subtle">{r.meta}</span>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- code

type Tok = [string, string];
const KW = /^(const|let|var|function|return|import|from|export|default|await|async|if|else|for|of|new|class|extends|type|interface)\b/;

/** Tiny deterministic highlighter (TS/JS-ish). */
export function highlight(line: string): Tok[] {
  const out: Tok[] = [];
  let s = line;
  while (s.length) {
    let m: RegExpExecArray | null;
    if ((m = /^\/\/.*/.exec(s))) out.push(["text-subtle italic", m[0]]);
    else if ((m = /^(["'`])(?:\\.|(?!\1).)*\1/.exec(s))) out.push(["text-accent-2", m[0]]);
    else if ((m = KW.exec(s))) out.push(["text-accent", m[0]]);
    else if ((m = /^\d+(\.\d+)?/.exec(s))) out.push(["text-warning", m[0]]);
    else if ((m = /^[A-Za-z_$][\w$]*(?=\()/.exec(s))) out.push(["text-fg font-medium", m[0]]);
    else if ((m = /^[A-Za-z_$][\w$]*/.exec(s))) out.push(["text-fg/85", m[0]]);
    else if ((m = /^\s+/.exec(s))) out.push(["", m[0]]);
    else if ((m = /^./.exec(s))) out.push(["text-muted", m[0]]);
    else break;
    s = s.slice(m![0].length);
  }
  return out;
}

/**
 * Syntax-highlighted code. Each line is `<ct>-l0…` (cascade them, or type a
 * line with `split: "chars"` + `typeOn`).
 */
export function CodeBlock({ ct, code, class: cls, numbers = true, size = 28 }: Box & { code: string; numbers?: boolean; size?: number }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("font-mono", cls)} style={{ fontSize: `${size}px`, lineHeight: "1.6" }}>
      {lines.map((l, i) => (
        <div class="flex whitespace-pre">
          {numbers && <span class="w-[2.6em] shrink-0 select-none pr-[1em] text-right text-subtle/60">{i + 1}</span>}
          <span data-ct={id(ct, `l${i}`)}>
            {highlight(l).map(([c, t]) => (c ? <span class={c}>{t}</span> : t))}
            {l.length === 0 ? " " : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Terminal: `$`-prefixed commands in fg, output lines muted. Lines are `<ct>-l0…`. */
export function Terminal({ ct, lines, class: cls, size = 28 }: Box & { lines: string[]; size?: number }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("font-mono", cls)} style={{ fontSize: `${size}px`, lineHeight: "1.6" }}>
      {lines.map((l, i) => (
        <div data-ct={id(ct, `l${i}`)} class={cx("whitespace-pre", l.startsWith("$") ? "text-fg" : l.startsWith("✔") ? "text-positive" : "text-muted")}>
          {l.startsWith("$") ? (
            <>
              <span class="text-accent">❯</span>
              {l.slice(1)}
            </>
          ) : (
            l
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- data

/** Bar chart. Bars are `<ct>-b0…` (origin bottom — grow with scaleY 0→1). */
export function BarChart({ ct, data, width = 640, height = 300, class: cls, highlightIndex }: Box & { data: number[]; width?: number; height?: number; highlightIndex?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div data-ct={id(ct)} class={cx("flex items-end gap-[14px]", cls)} style={{ width: `${width}px`, height: `${height}px` }}>
      {data.map((v, i) => (
        <div
          data-ct={id(ct, `b${i}`)}
          class={cx("flex-1 rounded-t-[10px]", i === highlightIndex ? "bg-accent" : "bg-fg/20")}
          style={{ height: `${Math.max(2, (v / max) * 100)}%`, transformOrigin: "bottom center" }}
        />
      ))}
    </div>
  );
}

/** Line chart drawn as an SVG path `<ct>-line` (animate with the `draw` preset) + area `<ct>-area`. */
export function LineChart({ ct, data, width = 640, height = 260, class: cls }: Box & { data: number[]; width?: number; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - ((v - min) / (max - min || 1)) * (height - 16) - 8]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L${width} ${height} L0 ${height} Z`;
  return (
    <svg data-ct={id(ct)} class={cls} width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" data-layout-ignore>
      <defs>
        <linearGradient id={`g-${ct}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--color-accent)" stop-opacity="0.35" />
          <stop offset="1" stop-color="var(--color-accent)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path data-ct={id(ct, "area")} d={area} fill={`url(#g-${ct})`} />
      <path data-ct={id(ct, "line")} d={d} pathLength={1} stroke="var(--color-accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style={{ strokeDasharray: "1", strokeDashoffset: "0" }} />
    </svg>
  );
}

/** Big number + label. Number is `<ct>` (use m.counter), label `<ct>-label`. */
export function Stat({ ct, value, label, class: cls, prefix, suffix, decimals = 0 }: { ct: string; value: number; label: string; class?: string; prefix?: string; suffix?: string; decimals?: number }) {
  const shown = (prefix ?? "") + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (suffix ?? "");
  return (
    <div class={cx("flex flex-col gap-[8px]", cls)}>
      <span data-ct={id(ct)} class="font-display text-h1 font-semibold tabular-nums text-fg">
        {shown}
      </span>
      <span data-ct={id(ct, "label")} class="font-sans text-caption text-muted">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- pointer

/**
 * macOS-style pointer. Place it absolutely (`class="left-[…] top-[…]"`) at its
 * starting point, then `m.path("cursor", [...])` and `m.click("cursor", …)`.
 * The click ripple is `<ct>-ripple`.
 */
export function Cursor({ ct, class: cls }: { ct: string; class?: string }) {
  return (
    <div data-ct={ctId(ct)} data-layout-ignore class={cx("pointer-events-none absolute z-50 h-[56px] w-[40px]", cls)}>
      <div data-ct={ctId(`${ct}-ripple`)} class="absolute left-[-30px] top-[-30px] h-[64px] w-[64px] rounded-full border-[3px] border-accent" style={{ opacity: "0" }} />
      <svg width="40" height="56" viewBox="0 0 20 28" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.45))" }}>
        <path d="M1 1 L1 22 L6.5 16.8 L10.2 25.5 L13.6 24 L9.9 15.4 L17.2 15.4 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round" />
      </svg>
    </div>
  );
}
