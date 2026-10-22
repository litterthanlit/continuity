/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import { DATA_HUES, type DataHue } from "../themes/index.js";
import { ctId, useScene } from "./context.js";
import { cx, type Style } from "./core.js";

/**
 * Product UI kit: litt's components (litt.md `system/components.md`) at video
 * scale, 2× (docs/decisions/0006).
 *
 * Real interfaces use 13–16px text; in a 1080p video that is illegible, so the
 * chrome doubles: 2px hairlines, 8px control and 16px surface radii, 88px
 * controls, 28px UI text (never below the 26px floor). Colour stays off chrome
 * (P11): the accent fills the one primary action, data hues mark data and
 * identity, status is a word. Every component exposes sub-element ids
 * (`<ct>-…`) so parts can be choreographed.
 */

const id = (ct: string | undefined, suffix?: string) => (ct ? ctId(suffix ? `${ct}-${suffix}` : ct) : undefined);

interface Box {
  ct?: string;
  class?: string;
  style?: Style;
  children?: ComponentChildren;
}

export type Tone = "neutral" | "success" | "warning" | "danger";

/** A data hue's tint fill with its text tone, a 24% hairline of the hue and the top highlight (tags, avatars). */
function hueStyle(hue: DataHue): string {
  const { highlight } = useScene().theme.material;
  return `background:var(--color-data-${hue}-tint);color:var(--color-data-${hue}-text);box-shadow:inset 0 0 0 2px color-mix(in oklab,var(--color-data-${hue}) 24%,transparent),inset 0 2px 0 ${highlight}`;
}

/** The raised edge (hairline + top highlight) drawn over a frame's content, so children never cover it. */
function Edge() {
  return <div class="pointer-events-none absolute inset-0 z-10 rounded-[inherit] shadow-raised" data-layout-ignore />;
}

/** Three neutral window dots: colour never sits on chrome (P11). */
function Dots() {
  return (
    <>
      <span class="h-[16px] w-[16px] rounded-full bg-fg/15" />
      <span class="h-[16px] w-[16px] rounded-full bg-fg/15" />
      <span class="h-[16px] w-[16px] rounded-full bg-fg/15" />
    </>
  );
}

// ---------------------------------------------------------------- frames

/** App window: a solid surface with the raised edge and a zero-offset float glow. Body is `<ct>-body`. */
export function Window({ ct, title, width = 1280, height = 760, class: cls, children }: Box & { title?: string; width?: number; height?: number }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("relative overflow-hidden rounded-surface bg-surface-1 shadow-lift", cls)} style={{ width: `${width}px`, height: `${height}px` }}>
      <div class="flex h-[64px] items-center gap-[12px] border-b-2 border-line px-[24px]">
        <Dots />
        {title && <span class="ml-[16px] font-sans text-[28px] font-title text-fg-muted">{title}</span>}
      </div>
      <div data-ct={id(ct, "body")} class="relative h-[calc(100%-64px)]">
        {children}
      </div>
      <Edge />
    </div>
  );
}

/** Browser window with an address field. Body is `<ct>-body`, the URL `<ct>-url`. */
export function Browser({ ct, url = "app.example.com", width = 1400, height = 820, class: cls, children }: Box & { url?: string; width?: number; height?: number }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("relative overflow-hidden rounded-surface bg-surface-1 shadow-lift", cls)} style={{ width: `${width}px`, height: `${height}px` }}>
      <div class="flex h-[80px] items-center gap-[12px] border-b-2 border-line px-[24px]">
        <Dots />
        <div class="mx-auto flex h-[48px] w-[52%] items-center justify-center gap-[12px] rounded-control bg-surface-2 font-sans text-[26px] text-fg-muted shadow-hairline">
          <svg width="16" height="20" viewBox="0 0 18 20" fill="none" data-layout-ignore>
            <rect x="2" y="9" width="14" height="10" rx="2" fill="currentColor" />
            <path d="M5 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.2" />
          </svg>
          <span data-ct={id(ct, "url")}>{url}</span>
        </div>
      </div>
      <div data-ct={id(ct, "body")} class="relative h-[calc(100%-80px)]">
        {children}
      </div>
      <Edge />
    </div>
  );
}

/** Phone frame (portrait). The bezel is a physical object, so its radius is the device's. Screen is `<ct>-screen`. */
export function Phone({ ct, width = 460, class: cls, children }: Box & { width?: number }) {
  const height = Math.round(width * 2.05);
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("relative rounded-[68px] border-[14px] border-device bg-canvas shadow-lift", cls)} style={{ width: `${width}px`, height: `${height}px` }}>
      <div class="absolute left-1/2 top-[18px] z-10 h-[36px] w-[132px] -translate-x-1/2 rounded-full bg-device" />
      <div data-ct={id(ct, "screen")} class="absolute inset-0 overflow-hidden rounded-[54px]">
        {children}
      </div>
    </div>
  );
}

/** A card in the flow: flat (P4), surface-1 with the hairline and the top highlight. Never glass, never a rail. */
export function Card({ ct, class: cls, style, children }: Box) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("relative rounded-surface bg-surface-1 p-[48px] shadow-raised", cls)} style={style}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- controls

const BUTTON_SIZE = {
  sm: "h-[64px] px-[24px] text-[26px]",
  md: "h-[88px] px-[32px] text-[28px]",
  lg: "h-[112px] px-[64px] text-[32px]",
} as const;

/**
 * A button on litt's control scale (64 / 88 / 112). `primary` is the frame's one
 * accent fill, with the glow (P1): one per frame. lg is for a hero CTA only.
 */
export function Button({
  ct,
  children,
  variant = "secondary",
  size = "md",
  class: cls,
}: Box & { variant?: "primary" | "secondary" | "ghost"; size?: keyof typeof BUTTON_SIZE }) {
  const v = {
    primary: "bg-accent text-accent-fg shadow-glow",
    secondary: "bg-surface-1 text-fg shadow-control",
    ghost: "text-fg-muted",
  }[variant];
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("inline-flex items-center justify-center gap-[16px] rounded-control font-sans font-title", BUTTON_SIZE[size], v, cls)}>
      {children}
    </div>
  );
}

/**
 * A tag: the selected segment's look, sentence case, at the label weight. A status
 * colours only its word (no dot); a category takes a data hue's tint (P11).
 */
export function Tag({ ct, children, tone = "neutral", hue, class: cls }: Box & { tone?: Tone; hue?: DataHue }) {
  const color = { neutral: "text-fg-muted", success: "text-success", warning: "text-warning", danger: "text-danger" }[tone];
  return (
    <div
      data-ct={id(ct)}
      data-ct-ui
      class={cx("inline-flex h-[56px] items-center rounded-control px-[16px] font-sans text-label font-label", !hue && "bg-surface-1 shadow-raised", !hue && color, cls)}
      style={hue ? hueStyle(hue) : undefined}
    >
      {children}
    </div>
  );
}

/** A real shortcut: mono, a chip at the control radius on surface-2 with a hairline. */
export function Kbd({ ct, children, class: cls }: Box) {
  return (
    <span data-ct={id(ct)} class={cx("inline-flex h-[48px] min-w-[48px] items-center justify-center rounded-control bg-surface-2 px-[12px] font-mono text-[28px] text-fg shadow-hairline", cls)}>
      {children}
    </span>
  );
}

/** Text field (md, 88). Typed text is `<ct>-text` (m.type), the caret `<ct>-caret` (m.blink). `focus` draws litt's focus ring. */
export function Input({
  ct,
  value = "",
  placeholder,
  icon = true,
  focus = false,
  class: cls,
  width = 760,
}: Box & { value?: string; placeholder?: string; icon?: boolean; focus?: boolean; width?: number }) {
  return (
    <div
      data-ct={id(ct)}
      data-ct-ui
      class={cx("flex h-[88px] items-center gap-[16px] rounded-control bg-surface-1 px-[32px] font-sans text-[28px]", focus ? "shadow-[inset_0_0_0_2px_var(--color-line-control),0_0_0_4px_var(--color-canvas),0_0_0_8px_var(--color-focus)]" : "shadow-field", cls)}
      style={{ width: `${width}px` }}
    >
      {icon && (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="text-fg-subtle" data-layout-ignore>
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      )}
      <span class="relative flex items-center">
        {placeholder && !value && <span class="text-fg-subtle">{placeholder}</span>}
        <span data-ct={id(ct, "text")} class="text-fg">
          {value}
        </span>
        <span data-ct={id(ct, "caret")} data-layout-ignore class="ml-[4px] inline-block h-[36px] w-[3px] bg-focus" />
      </span>
    </div>
  );
}

/**
 * A switch: a pill track that fills with fg when on, never the accent (P1).
 * Turn it on at the instant tier: `<ct>-knob` x 0→32, `<ct>-on` and `<ct>-knob-on` opacity 0→1.
 */
export function Toggle({ ct, on = false, class: cls }: Box & { on?: boolean }) {
  const o = on ? "1" : "0";
  return (
    <div data-ct={id(ct)} class={cx("relative h-[40px] w-[72px] rounded-full bg-surface-1 shadow-field", cls)}>
      <div data-ct={id(ct, "on")} class="absolute inset-0 rounded-full bg-fg" style={{ opacity: o }} />
      <div data-ct={id(ct, "knob")} class="absolute left-[4px] top-[4px] h-[32px] w-[32px] rounded-full bg-line-control" style={on ? { transform: "translate3d(32px,0,0)" } : undefined}>
        <div data-ct={id(ct, "knob-on")} class="absolute inset-0 rounded-full bg-canvas" style={{ opacity: o }} />
      </div>
    </div>
  );
}

/** A meter: one value against a limit, a rail at fg 12% filled with fg (or a data hue that names the thing). Animate `<ct>-fill` with grow-like scaleX. */
export function Meter({ ct, value = 1, hue, class: cls, width = 640 }: Box & { value?: number; hue?: DataHue; width?: number }) {
  return (
    <div data-ct={id(ct)} class={cx("relative h-[8px] overflow-hidden rounded-control bg-fg/12", cls)} style={{ width: `${width}px` }}>
      <div
        data-ct={id(ct, "fill")}
        class={cx("absolute inset-y-0 left-0", !hue && "bg-fg")}
        style={{ width: `${Math.round(value * 100)}%`, transformOrigin: "left center", ...(hue ? { background: `var(--color-data-${hue})` } : {}) }}
      />
    </div>
  );
}

/**
 * A slider — the machinery on screen (a parameter being tuned while the thing it drives
 * answers). A label and its mono value over a rail at fg 12%, filled with fg up to a fg
 * thumb that lifts off the rail. To drag it from a to b, move all three together:
 * `<ct>-fill` scaleX a→b, `<ct>-thumb` x a·width→b·width, and `m.counter("<ct>-value", …)`.
 */
export function Slider({
  ct,
  label,
  value = 0.5,
  display,
  width = 640,
  class: cls,
}: Box & { label?: string; value?: number; display?: string; width?: number }) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("flex flex-col gap-[24px]", cls)} style={{ width: `${width}px` }}>
      {label && (
        <div class="flex items-baseline justify-between font-sans text-[28px] leading-[36px]">
          <span data-ct={id(ct, "label")} class="text-fg-muted">
            {label}
          </span>
          <span data-ct={id(ct, "value")} class="font-mono tabular-nums text-fg">
            {display ?? v.toFixed(2)}
          </span>
        </div>
      )}
      <div class="relative h-[40px]">
        <div class="absolute inset-x-0 top-[16px] h-[8px] overflow-hidden rounded-control bg-fg/12">
          <div data-ct={id(ct, "fill")} class="absolute inset-0 bg-fg" style={{ transformOrigin: "left center", transform: `scaleX(${v})` }} />
        </div>
        <div
          data-ct={id(ct, "thumb")}
          class="absolute left-[-20px] top-0 h-[40px] w-[40px] rounded-full bg-fg shadow-lift"
          style={{ transform: `translate3d(${Math.round(v * width)}px,0,0)` }}
        />
      </div>
    </div>
  );
}

/**
 * A segmented control: the track at fg 5% with a hairline, the selected segment
 * raised (P12). Segments are equal width, so moving the selection is `<ct>-thumb`
 * x → index × segment (responsive), with `ink`/`dim` on the labels `<ct>-s0…`.
 */
export function Segmented({ ct, items, active = 0, segment = 200, class: cls }: Box & { items: string[]; active?: number; segment?: number }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("relative inline-flex self-start rounded-surface bg-fg/5 p-[8px] shadow-hairline", cls)}>
      <div
        data-ct={id(ct, "thumb")}
        class="absolute left-[8px] top-[8px] h-[64px] rounded-control bg-surface-1 shadow-raised"
        style={{ width: `${segment}px`, transform: `translate3d(${active * segment}px,0,0)` }}
      />
      {items.map((label, i) => (
        <div
          data-ct={id(ct, `s${i}`)}
          class={cx("relative flex h-[64px] items-center justify-center font-sans text-[26px] font-title", i === active ? "text-fg" : "text-fg-subtle")}
          style={{ width: `${segment}px` }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- content

/**
 * A notification: glass (it floats), the surface radius, a zero-offset float. No
 * icon, no dot: an error's title is danger, and the words say the rest.
 */
export function Toast({ ct, title, body, tone = "neutral", class: cls }: Box & { title: string; body?: string; tone?: "neutral" | "danger" }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("ct-glass flex w-[640px] flex-col gap-[8px] rounded-surface px-[32px] py-[24px]", cls)}>
      <div data-ct={id(ct, "title")} class={cx("font-sans text-[28px] font-title", tone === "danger" ? "text-danger" : "text-fg")}>
        {title}
      </div>
      {body && (
        <div data-ct={id(ct, "body")} class="font-sans text-[26px] text-fg-subtle">
          {body}
        </div>
      )}
    </div>
  );
}

const hashHue = (s: string): DataHue => DATA_HUES[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % DATA_HUES.length];

/** A person or a company: initials at 400 on a data hue's tint (identity is data, P11). A stable hash picks the hue. */
export function Avatar({ ct, initials, hue, class: cls, size = 64 }: Box & { initials: string; hue?: DataHue; size?: number }) {
  return (
    <div
      data-ct={id(ct)}
      class={cx("flex items-center justify-center rounded-full font-sans font-normal", cls)}
      style={`width:${size}px;height:${size}px;font-size:${Math.max(26, Math.round(size * 0.4))}px;${hueStyle(hue ?? hashHue(initials))}`}
    >
      {initials}
    </div>
  );
}

/**
 * Sidebar navigation. The current item wears the raised segment (P12): fg on
 * surface-2 with the hairline and the highlight; the others are in the grey.
 * Items are `<ct>-i0…`.
 */
export function Sidebar({ ct, items, active = 0, heading, class: cls }: Box & { items: string[]; active?: number; heading?: string }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("flex h-full w-[400px] flex-col gap-[4px] border-r-2 border-line bg-surface-1 p-[16px]", cls)}>
      {heading && <div class="flex h-[64px] items-center px-[24px] font-sans text-[28px] font-title text-fg">{heading}</div>}
      {items.map((label, i) => (
        <div
          data-ct={id(ct, `i${i}`)}
          class={cx("flex h-[72px] items-center rounded-control px-[24px] font-sans text-[28px]", i === active ? "bg-surface-2 text-fg shadow-raised" : "text-fg-muted")}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

export interface ListRow {
  title: string;
  /** Mono, in the grey, at the end: an id, a version, a time. */
  meta?: string;
  /** A status, in words (a Tag). */
  tag?: string;
  tone?: Tone;
}

/** List rows (issues, deploys, tasks), 2px hairlines between them. Status is a word, never a dot. Rows are `<ct>-r0…`. */
export function List({ ct, rows, class: cls }: Box & { rows: ListRow[] }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("flex flex-col", cls)}>
      {rows.map((r, i) => (
        <div data-ct={id(ct, `r${i}`)} class="flex h-[88px] items-center gap-[24px] border-b-2 border-line px-[32px]">
          <span class="font-sans text-[28px] text-fg">{r.title}</span>
          <span class="ml-auto flex items-center gap-[24px]">
            {r.tag && <Tag tone={r.tone}>{r.tag}</Tag>}
            {r.meta && <span class="font-mono text-[26px] text-fg-subtle">{r.meta}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- code

type Tok = [string, string];
const KW = /^(const|let|var|function|return|import|from|export|default|await|async|if|else|for|of|new|class|extends|type|interface)\b/;
const STRING = "text-[color-mix(in_oklab,var(--color-accent-text)_90%,var(--color-fg))]";

/** Tiny deterministic highlighter (TS/JS-ish), litt's quiet way: identifiers fg, keywords and signs grey, strings a trace of accent. */
export function highlight(line: string): Tok[] {
  const out: Tok[] = [];
  let s = line;
  while (s.length) {
    let m: RegExpExecArray | null;
    if ((m = /^\/\/.*/.exec(s))) out.push(["text-fg-subtle", m[0]]);
    else if ((m = /^(["'`])(?:\\.|(?!\1).)*\1/.exec(s))) out.push([STRING, m[0]]);
    else if ((m = KW.exec(s))) out.push(["text-fg-muted", m[0]]);
    else if ((m = /^\d+(\.\d+)?/.exec(s))) out.push(["text-fg", m[0]]);
    else if ((m = /^[A-Za-z_$][\w$]*/.exec(s))) out.push(["text-fg", m[0]]);
    else if ((m = /^\s+/.exec(s))) out.push(["", m[0]]);
    else if ((m = /^./.exec(s))) out.push(["text-fg-muted", m[0]]);
    else break;
    s = s.slice(m![0].length);
  }
  return out;
}

/**
 * Syntax-highlighted code (mono, 28). Each line is `<ct>-l0…` (cascade them, or
 * type a line with `split: "chars"` + `typeOn`). Put it on a surface-2 Card or in a Window.
 */
export function CodeBlock({ ct, code, class: cls, numbers = true, size = 28 }: Box & { code: string; numbers?: boolean; size?: number }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("font-mono", cls)} style={{ fontSize: `${size}px`, lineHeight: "1.6" }}>
      {lines.map((l, i) => (
        <div class="flex whitespace-pre">
          {numbers && <span class="w-[2.6em] shrink-0 select-none pr-[1em] text-right text-fg-subtle">{i + 1}</span>}
          <span data-ct={id(ct, `l${i}`)}>
            {highlight(l).map(([c, t]) => (c ? <span class={c}>{t}</span> : t))}
            {l.length === 0 ? " " : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Terminal: `$` commands in fg after a grey prompt, output in the grey, `✔` lines in success. Lines are `<ct>-l0…`. */
export function Terminal({ ct, lines, class: cls, size = 28 }: Box & { lines: string[]; size?: number }) {
  return (
    <div data-ct={id(ct)} data-ct-ui class={cx("font-mono", cls)} style={{ fontSize: `${size}px`, lineHeight: "1.6" }}>
      {lines.map((l, i) => (
        <div data-ct={id(ct, `l${i}`)} class={cx("whitespace-pre", l.startsWith("$") ? "text-fg" : l.startsWith("✔") ? "text-success" : "text-fg-muted")}>
          {l.startsWith("$") ? (
            <>
              <span class="text-fg-subtle">$</span>
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

/**
 * Bar chart, litt's quiet way: bars at fg 55%, the current bar (`current`,
 * default the last) in fg, square tops, at most 64px thick, a line-strong
 * baseline. A data hue only when the series has a colour elsewhere. Bars are
 * `<ct>-b0…`, origin at the base: `m.enter([...], "grow", { stagger: "list" })`.
 */
export function BarChart({
  ct,
  data,
  width = 640,
  height = 300,
  class: cls,
  current,
  hue,
}: Box & { data: number[]; width?: number; height?: number; current?: number; hue?: DataHue }) {
  const max = Math.max(...data, 1);
  const cur = current ?? data.length - 1;
  return (
    <div data-ct={id(ct)} class={cx("flex items-end justify-between border-b-2 border-line-strong", cls)} style={{ width: `${width}px`, height: `${height}px` }}>
      {data.map((v, i) => (
        <div class="flex h-full flex-1 items-end justify-center">
          <div
            data-ct={id(ct, `b${i}`)}
            class={cx("w-[60%] max-w-[64px]", !hue && (i === cur ? "bg-fg" : "bg-fg/55"))}
            style={{
              height: `${Math.max(1, (v / max) * 100)}%`,
              transformOrigin: "bottom center",
              ...(hue ? { background: i === cur ? `var(--color-data-${hue}-text)` : `var(--color-data-${hue})` } : {}),
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Line chart: a 4px line in fg (or a data hue), round joins, no area and no gradient, a dot on the latest point. The line is `<ct>-line` (draw), the dot `<ct>-dot`. */
export function LineChart({ ct, data, width = 640, height = 260, class: cls, hue }: Box & { data: number[]; width?: number; height?: number; hue?: DataHue }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (width - 16) + 8, height - ((v - min) / (max - min || 1)) * (height - 16) - 8]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  const stroke = hue ? `var(--color-data-${hue})` : "var(--color-fg)";
  return (
    <svg data-ct={id(ct)} class={cls} width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" data-layout-ignore>
      <path data-ct={id(ct, "line")} d={d} pathLength={1} stroke={stroke} stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style={{ strokeDasharray: "1", strokeDashoffset: "0" }} />
      <circle data-ct={id(ct, "dot")} cx={lx.toFixed(1)} cy={ly.toFixed(1)} r="8" fill={hue ? `var(--color-data-${hue}-text)` : "var(--color-fg)"} />
    </svg>
  );
}

/**
 * A figure that says how things stand: the label above (in the grey), the value
 * at 500 with tabular figures (title by default; `size="display"` when the number
 * is the scene's statement), an optional unit in the grey and a delta in words
 * ("Up 12% on last week") — success, danger or the grey. Number is `<ct>`
 * (m.counter), label `<ct>-label`, delta `<ct>-delta`.
 */
export function Stat({
  ct,
  value,
  label,
  class: cls,
  prefix,
  suffix,
  unit,
  decimals = 0,
  size = "title",
  delta,
  deltaTone = "neutral",
}: {
  ct: string;
  value: number;
  label: string;
  class?: string;
  prefix?: string;
  suffix?: string;
  unit?: string;
  decimals?: number;
  size?: "display" | "title";
  delta?: string;
  deltaTone?: "neutral" | "success" | "danger";
}) {
  const figures = useScene().typeKit.figures;
  const shown = (prefix ?? "") + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (suffix ?? "");
  return (
    <div class={cx("flex flex-col gap-[8px]", cls)}>
      <span data-ct={id(ct, "label")} class="font-sans text-small text-fg-subtle">
        {label}
      </span>
      <span class={cx("flex items-baseline gap-[8px]", `text-${size}`)}>
        <span data-ct={id(ct)} class={cx(`font-${figures} font-title tabular-nums text-fg`)}>
          {shown}
        </span>
        {unit && <span class="font-sans font-title text-fg-subtle">{unit}</span>}
      </span>
      {delta && (
        <span data-ct={id(ct, "delta")} class={cx("font-sans text-small", { neutral: "text-fg-subtle", success: "text-success", danger: "text-danger" }[deltaTone])}>
          {delta}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- pointer

/**
 * macOS-style pointer with a zero-offset shadow (P4). Place it absolutely at its
 * starting point, then `m.path("cursor", [...])` and `m.click("cursor", …)`. The
 * click ring is `<ct>-ripple`, in the focus colour.
 */
export function Cursor({ ct, class: cls }: { ct: string; class?: string }) {
  return (
    <div data-ct={ctId(ct)} data-layout-ignore class={cx("pointer-events-none absolute z-50 h-[56px] w-[40px]", cls)}>
      <div data-ct={ctId(`${ct}-ripple`)} class="absolute left-[-30px] top-[-30px] h-[64px] w-[64px] rounded-full border-[4px] border-focus" style={{ opacity: "0" }} />
      <svg width="40" height="56" viewBox="0 0 20 28" style={{ filter: "drop-shadow(0 0 6px rgba(0,0,0,.35))" }}>
        <path d="M1 1 L1 22 L6.5 16.8 L10.2 25.5 L13.6 24 L9.9 15.4 L17.2 15.4 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------- imagery and annotation

/**
 * How imported imagery is forced into the palette (docs/decisions/0007): photos never
 * arrive in their own colours. `mono` greys them, `contrast` greys and pushes them,
 * `invert` turns them into a negative (prints, drawings on the dark theme). Static.
 */
export type MediaTreat = "none" | "mono" | "contrast" | "invert";
const TREAT: Record<MediaTreat, string> = {
  none: "none",
  mono: "grayscale(1) contrast(1.08)",
  contrast: "grayscale(1) contrast(1.6) brightness(0.96)",
  invert: "grayscale(1) invert(1) contrast(1.1)",
};

/**
 * An image in a strict container: a flat surface (radius 16, the raised edge) that clips
 * its picture. Imagery always sits in a box, never loose on the stage. The picture is
 * `<ct>-img`, so it can drift inside its frame (`m.tween("tile-img", { scale: [1, 1.04] })`)
 * while the frame holds still. `src` is relative to the build (`assets/…`).
 */
export function Media({
  ct,
  src,
  alt = "",
  width = 640,
  height = 640,
  treat = "mono",
  position = "50% 50%",
  class: cls,
  children,
}: Box & { src: string; alt?: string; width?: number; height?: number; treat?: MediaTreat; position?: string }) {
  return (
    <div data-ct={id(ct)} class={cx("relative overflow-hidden rounded-surface bg-surface-1", cls)} style={`width:${width}px;height:${height}px`}>
      <img
        data-ct={id(ct, "img")}
        src={src}
        alt={alt}
        class="absolute inset-0 h-full w-full"
        style={`object-fit:cover;object-position:${position};filter:${TREAT[treat]}`}
      />
      {children}
      <Edge />
    </div>
  );
}

/**
 * An annotation marker (a node): a ring with a numbered mono label, the technical overlay laid on
 * organic imagery. Place it absolutely on the point it marks (its centre is the ring's
 * centre); connect markers with `Path` hairlines (strokeWidth 2) and `draw` them on. The
 * label sits on a canvas chip, so it reads over any imagery.
 * Parts are `<ct>-ring` and `<ct>-label`.
 */
export function Marker({ ct, label, side = "right", class: cls }: { ct: string; label?: string; side?: "left" | "right"; class?: string }) {
  return (
    <div data-ct={id(ct)} class={cx("absolute flex h-[24px] w-[24px] items-center", cls)} style="margin:-12px 0 0 -12px">
      <span data-ct={id(ct, "ring")} class="h-[24px] w-[24px] rounded-full border-2 border-fg bg-canvas" />
      {label && (
        <span
          data-ct={id(ct, "label")}
          class={cx("absolute whitespace-nowrap rounded-control bg-canvas px-[8px] font-mono text-[26px] leading-[36px] text-fg", side === "right" ? "left-[40px]" : "right-[40px]")}
        >
          {label}
        </span>
      )}
    </div>
  );
}
