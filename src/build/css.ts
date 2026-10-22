import { compile } from "@tailwindcss/node";
import { basename } from "node:path";
import { symbolFonts } from "../themes/fonts.js";
import { DATA_HUES, type FontFamily, type Theme } from "../themes/index.js";
import { WEIGHTS, kitFamilies, kitScale, littKit, type RoleStyle, type ScaleStep, type TypeKit, type TypeSize } from "../themes/kits.js";

/** litt's type scale at a 1080px short side (landscape and square), [size, line height px, tracking]. */
export const TYPE_SCALE: Record<TypeSize, ScaleStep> = littKit.scale;

const SYMBOL_STACK = symbolFonts.map((f) => `"${f.family}"`).join(", ");
const stack = (f: FontFamily) => `"${f.family}", ${SYMBOL_STACK}, ${f.fallback}`;

/** Every vendored family a build needs: the kits' four roles + symbol fallbacks. */
export function buildFamilies(kits: TypeKit[]): FontFamily[] {
  const seen = new Map<string, FontFamily>();
  for (const f of [...kitFamilies(kits), ...symbolFonts]) seen.set(f.family, f);
  return [...seen.values()];
}

/**
 * @font-face rules pointing at fonts copied next to the composition. Width-
 * variable files declare their `font-stretch` range — without it Chrome clamps
 * font-stretch to 100% and the wdth axis never applies.
 */
export function fontFaceCss(families: FontFamily[]): string {
  return families
    .flatMap((f) =>
      f.faces.map(
        (face) =>
          `@font-face{font-family:"${f.family}";src:url("fonts/${basename(face.file)}") format("woff2");` +
          `font-weight:${face.weight};font-style:${face.style};${face.stretch ? `font-stretch:${face.stretch};` : ""}font-display:block;}`,
      ),
    )
    .join("\n");
}

/** Font shorthands the runtime preloads before measuring/splitting text. */
export function fontLoadList(families: FontFamily[]): string[] {
  return families.flatMap((f) =>
    f.faces.map((face) => {
      const w = face.weight.includes(" ") ? face.weight.split(" ").map(Number).reduce((a, b) => Math.round((a + b) / 2)) : face.weight;
      return `${face.style} ${w} 1em "${f.family}"`;
    }),
  );
}

/**
 * litt's tokens as Tailwind theme variables: colours (`bg-canvas`, `text-fg-muted`,
 * `border-line`…), the type scale (`text-display`…`text-label`), the role weights
 * (`font-title`, `font-label`), the two radii (`rounded-control`, `rounded-surface`)
 * and the depth: `shadow-hairline` (a 2px line), `shadow-raised` (the line plus the
 * top highlight: cards), `shadow-control` (a secondary button), `shadow-field`
 * (an input's outline), `shadow-float` / `shadow-modal` / `shadow-tooltip` (raised
 * plus a zero-offset glow and ring), `shadow-lift` (the glow alone, for frames
 * whose edge is drawn on top), `shadow-focus` and `shadow-glow` (the one primary
 * action). No offsets anywhere (P4). Chrome is litt at 2× (docs/decisions/0006).
 */
function themeCss(theme: Theme, kit: TypeKit, portrait: boolean): string {
  const m = theme.material;
  const colors = Object.entries(theme.colors)
    .map(([k, v]) => `  --color-${k}: ${v};`)
    .join("\n");
  const tints = DATA_HUES.map((h) => `  --color-data-${h}-tint: color-mix(in oklab, var(--color-data-${h}) ${m.tint}%, var(--color-surface-1));`).join("\n");
  const type = Object.entries(kitScale(kit, portrait))
    .map(([k, [size, lh, ls]]) => `  --text-${k}: ${size}px;\n  --text-${k}--line-height: ${lh}px;\n  --text-${k}--letter-spacing: ${ls};`)
    .join("\n");
  const highlight = `inset 0 2px 0 ${m.highlight}`;
  return `@theme static {
${colors}
${tints}
  --font-display: ${stack(kit.roles.display.family)};
  --font-sans: ${stack(kit.roles.sans.family)};
  --font-mono: ${stack(kit.roles.mono.family)};
  --default-font-family: var(--font-sans);
  --default-mono-font-family: var(--font-mono);
  --font-weight-text: ${WEIGHTS.text};
  --font-weight-title: ${WEIGHTS.title};
  --font-weight-label: ${WEIGHTS.label};
${type}
  --radius-control: ${theme.radius.control}px;
  --radius-surface: ${theme.radius.surface}px;
  --shadow-hairline: inset 0 0 0 2px var(--color-line);
  --shadow-raised: inset 0 0 0 2px var(--color-line), ${highlight};
  --shadow-control: inset 0 0 0 2px var(--color-line-strong), ${highlight};
  --shadow-field: inset 0 0 0 2px var(--color-line-control);
  --shadow-lift: ${m.shadowFloat};
  --shadow-focus: 0 0 0 4px var(--color-canvas), 0 0 0 8px var(--color-focus);
  --shadow-tooltip: ${m.shadowTooltip};
  --shadow-float: inset 0 0 0 2px var(--color-line), ${highlight}, ${m.shadowFloat};
  --shadow-modal: inset 0 0 0 2px var(--color-line), ${highlight}, ${m.shadowModal};
  --shadow-glow: 0 0 0 2px color-mix(in oklab, var(--color-accent) 55%, transparent), 0 0 48px color-mix(in oklab, var(--color-accent) ${m.glow}%, transparent), inset 0 2px 0 color-mix(in oklab, white 22%, transparent);
}`;
}

/**
 * litt's material, static (P5): the top light, the technical grid, and the glass (only for floating
 * UI with content behind it) with the highlight on its top edge. In a video no
 * fixed child can be trapped, so the blur sits on the element, not a ::before.
 */
function materialCss(theme: Theme): string {
  const m = theme.material;
  return `.ct-lit { background-image: radial-gradient(120% 70% at 50% -10%, color-mix(in oklab, var(--color-accent) ${m.light}%, transparent) 0%, transparent 65%); background-repeat: no-repeat; }
.ct-grid { background-image: linear-gradient(to right, var(--color-line) 2px, transparent 2px), linear-gradient(to bottom, var(--color-line) 2px, transparent 2px);
  background-size: 96px 96px; background-position: calc(50% - 1px) calc(50% - 1px); opacity: 0.6; }
.ct-glass { background: ${m.glass}; -webkit-backdrop-filter: blur(40px) saturate(140%); backdrop-filter: blur(40px) saturate(140%);
  box-shadow: inset 0 0 0 2px ${m.glassBorder}, inset 0 2px 0 ${m.highlight}, ${m.shadowFloat}; }
`;
}

const baseCss = (theme: Theme) => `
html, body { margin: 0; padding: 0; background: var(--color-canvas); }
#root { position: relative; overflow: hidden; background: var(--color-canvas); color: var(--color-fg);
  font-family: var(--font-sans); -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;
  font-kerning: normal; }
.ct-scene { position: absolute; inset: 0; overflow: hidden; perspective: 2200px; }
.ct-camera { position: absolute; inset: 0; transform-origin: 50% 50%; }
.ct-measuring .ct-scene { display: block !important; visibility: hidden !important; }
h1, h2, h3, h4, h5, h6, b, strong { font-weight: ${WEIGHTS.title}; }
${materialCss(theme)}`;

const ROLES = ["display", "sans", "mono"] as const;

function roleDecl(role: RoleStyle, reset: boolean): string {
  const d = [`font-weight:${role.weight}`];
  if (role.width !== undefined) d.push(`font-stretch:${role.width}%`);
  else if (reset) d.push("font-stretch:normal");
  if (role.axes && Object.keys(role.axes).length) d.push(`font-variation-settings:${variationSettings(role.axes)}`);
  else if (reset) d.push("font-variation-settings:normal");
  if (reset) d.push("font-feature-settings:normal");
  return d.join(";");
}

/** `{ SOFT: 100, WONK: 1 }` → `"SOFT" 100, "WONK" 1`. */
export function variationSettings(axes: Record<string, number>): string {
  return Object.entries(axes)
    .map(([a, v]) => `"${a}" ${v}`)
    .join(", ");
}

/**
 * Role rules of a kit, in @layer components: after preflight (so they beat
 * `h1 { font-weight: inherit }`), before utilities (so an author's `font-label`
 * or `tracking-*` still wins). A scoped kit (`[data-ct-type="…"]`, a scene
 * override) also re-declares the font variables and resets every role property
 * so the global kit never leaks into it.
 */
export function kitCss(kit: TypeKit, scope?: string, portrait = false): string {
  const root = scope ?? "#root";
  const sel = (s: string) => (scope ? `${scope} ${s}` : s);
  const out: string[] = [];
  const vars = scope
    ? ROLES.map((r) => `--font-${r}:${stack(kit.roles[r].family)};`).join("") +
      Object.entries(kitScale(kit, portrait))
        .map(([k, [, lh, ls]]) => `--text-${k}--line-height:${lh}px;--text-${k}--letter-spacing:${ls};`)
        .join("") +
      "font-family:var(--font-sans);"
    : "";
  out.push(`${root}{${vars}font-synthesis:none;${roleDecl(kit.roles.sans, !!scope)}}`);
  for (const r of ROLES) out.push(`${sel(`.font-${r}`)}{${roleDecl(kit.roles[r], !!scope)}}`);
  return out.join("\n");
}

/**
 * Tailwind v4 compiled for exactly the classes the rendered HTML uses.
 * `sceneKits` are per-scene overrides, scoped to `[data-ct-type="<name>"]`.
 */
export async function compileCss(theme: Theme, kit: TypeKit, sceneKits: TypeKit[], candidates: Iterable<string>, base: string, portrait = false): Promise<string> {
  const components = [kitCss(kit, undefined, portrait), ...sceneKits.map((k) => kitCss(k, `[data-ct-type="${k.name}"]`, portrait))].join("\n");
  const input = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);
${themeCss(theme, kit, portrait)}
@layer base {${baseCss(theme)}}
@property --tw-tracking { syntax: "*"; inherits: false; }
@property --tw-leading { syntax: "*"; inherits: false; }
@layer components {
${components}
}
`;
  const compiler = await compile(input, { base, onDependency: () => {} });
  return sanitizeFontStacks(compiler.build([...new Set(candidates)]));
}

/**
 * Preflight's `var(--default-font-family, <system stack>)` fallbacks name
 * system/emoji fonts that don't exist in the render container (and that
 * HyperFrames lint rejects). Our theme always defines the variables, so the
 * fallbacks are dead weight — drop them.
 */
export function sanitizeFontStacks(css: string): string {
  return css
    .replace(/var\(--default-font-family,[^;]*\)/g, "var(--default-font-family)")
    .replace(/var\(--default-mono-font-family,[^;]*\)/g, "var(--default-mono-font-family)");
}

/** Every token inside class="…" attributes of an HTML string. */
export function classCandidates(html: string): Set<string> {
  const out = new Set<string>();
  const re = /\sclass="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) for (const c of m[1].split(/\s+/)) if (c) out.add(c);
  return out;
}
