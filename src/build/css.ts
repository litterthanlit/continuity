import { compile } from "@tailwindcss/node";
import { basename } from "node:path";
import { symbolFonts } from "../themes/fonts.js";
import type { FontFamily, Theme } from "../themes/index.js";
import { kitFamilies, type RoleStyle, type TypeKit, type TypeSize } from "../themes/kits.js";

/**
 * Type scale in px for a 1080px short side (all supported formats share it).
 * [size, line-height, letter-spacing]
 */
export const TYPE_SCALE: Record<string, [number, number, string]> = {
  mega: [240, 0.88, "-0.05em"],
  display: [168, 0.92, "-0.045em"],
  h1: [120, 0.98, "-0.04em"],
  h2: [88, 1.04, "-0.03em"],
  h3: [64, 1.1, "-0.02em"],
  lead: [48, 1.22, "-0.01em"],
  body: [38, 1.38, "0em"],
  caption: [30, 1.35, "0.005em"],
  micro: [26, 1.3, "0.02em"],
};

const SYMBOL_STACK = symbolFonts.map((f) => `"${f.family}"`).join(", ");
const stack = (f: FontFamily) => `"${f.family}", ${SYMBOL_STACK}, ${f.fallback}`;

/** Every vendored family a build needs: the kits' four roles + symbol fallbacks. */
export function buildFamilies(kits: TypeKit[]): FontFamily[] {
  const seen = new Map<string, FontFamily>();
  for (const f of [...kitFamilies(kits), ...symbolFonts]) seen.set(f.family, f);
  return [...seen.values()];
}

/** The global type scale with a kit's [line-height, tracking] overrides. */
export function kitScale(kit: TypeKit): Record<string, [number, number, string]> {
  return Object.fromEntries(
    Object.entries(TYPE_SCALE).map(([k, [size, lh, ls]]) => {
      const o = kit.scale[k as TypeSize];
      return [k, o ? [size, o[0], o[1]] : [size, lh, ls]];
    }),
  );
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

function themeCss(theme: Theme, kit: TypeKit): string {
  const colors = Object.entries(theme.colors)
    .map(([k, v]) => `  --color-${k}: ${v};`)
    .join("\n");
  const type = Object.entries(kitScale(kit))
    .map(
      ([k, [size, lh, ls]]) =>
        `  --text-${k}: ${size}px;\n  --text-${k}--line-height: ${lh};\n  --text-${k}--letter-spacing: ${ls};`,
    )
    .join("\n");
  return `@theme static {
${colors}
  --font-display: ${stack(kit.roles.display.family)};
  --font-sans: ${stack(kit.roles.sans.family)};
  --font-mono: ${stack(kit.roles.mono.family)};
  --font-serif: ${stack(kit.roles.serif.family)};
  --default-font-family: var(--font-sans);
  --default-mono-font-family: var(--font-mono);
${type}
  --radius-sm: ${theme.radius.sm}px;
  --radius-md: ${theme.radius.md}px;
  --radius-lg: ${theme.radius.lg}px;
  --radius-xl: ${theme.radius.xl}px;
  --shadow-glow: 0 0 120px color-mix(in oklab, var(--color-accent) 35%, transparent);
  --shadow-float: 0 40px 120px -20px rgba(0,0,0,${theme.mode === "dark" ? "0.65" : "0.22"}), 0 0 0 1px var(--color-border);
}`;
}

/**
 * v1 (classic) set Inter stylistic sets on every family. The vendored latin
 * subsets don't carry ss01/cv11 at all (tests/fonts.test.ts), so v2 kits drop
 * the rule rather than let it leak into families that might.
 */
const baseCss = (v1: boolean) => `
html, body { margin: 0; padding: 0; background: var(--color-bg); }
#root { position: relative; overflow: hidden; background: var(--color-bg); color: var(--color-fg);
  font-family: var(--font-sans); -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;
  font-kerning: normal;${v1 ? ` font-feature-settings: "ss01" on, "cv11" on;` : ""} }
.ct-scene { position: absolute; inset: 0; overflow: hidden; perspective: 2200px; }
.ct-camera { position: absolute; inset: 0; transform-origin: 50% 50%; }
.ct-measuring .ct-scene { display: block !important; visibility: hidden !important; }
${v1 ? `.font-display { font-feature-settings: "ss01" on, "cv11" on, "calt" on; }\n` : ""}`;

const ROLES = ["display", "sans", "mono", "serif"] as const;

function roleDecl(role: RoleStyle, reset: boolean): string {
  const d = [`font-weight:${role.weight}`];
  if (role.width !== undefined) d.push(`font-stretch:${role.width}%`);
  else if (reset) d.push("font-stretch:normal");
  if (role.axes && Object.keys(role.axes).length) d.push(`font-variation-settings:${variationSettings(role.axes)}`);
  else if (reset) d.push("font-variation-settings:normal");
  if (role.case) d.push(`text-transform:${role.case}`);
  else if (reset) d.push("text-transform:none");
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
 * Role rules of a v2 kit, in @layer components: after preflight (so they beat
 * `h1 { font-weight: inherit }`), before utilities (so an author's `font-bold`
 * or `tracking-*` still wins). A scoped kit (`[data-ct-type="…"]`, a scene
 * override) also re-declares the font variables and resets every role property
 * so the global kit never leaks into it. Classic emits nothing.
 */
export function kitCss(kit: TypeKit, scope?: string): string {
  if (kit.v1) return "";
  const root = scope ?? "#root";
  const sel = (s: string) => (scope ? `${scope} ${s}` : s);
  const out: string[] = [];
  const vars = scope
    ? ROLES.map((r) => `--font-${r}:${stack(kit.roles[r].family)};`).join("") +
      Object.entries(kitScale(kit))
        .map(([k, [, lh, ls]]) => `--text-${k}--line-height:${lh};--text-${k}--letter-spacing:${ls};`)
        .join("") +
      "font-family:var(--font-sans);"
    : "";
  out.push(`${root}{${vars}font-synthesis:none;${roleDecl(kit.roles.sans, !!scope)}}`);
  for (const r of ROLES) out.push(`${sel(`.font-${r}`)}{${roleDecl(kit.roles[r], !!scope)}}`);
  const lt = kit.label.tracking;
  out.push(`${sel(".ct-label")}{text-transform:${kit.label.case};--tw-tracking:${lt};letter-spacing:${lt}}`);
  const a = kit.accent;
  out.push(
    `${sel(".ct-accent")}{font-size:${a.scale}em;--tw-tracking:${a.tracking};letter-spacing:${a.tracking}${a.case ? `;text-transform:${a.case}` : ""}}`,
  );
  return out.join("\n");
}

/**
 * Tailwind v4 compiled for exactly the classes the rendered HTML uses.
 * `sceneKits` are per-scene overrides, scoped to `[data-ct-type="<name>"]`.
 */
export async function compileCss(theme: Theme, kit: TypeKit, sceneKits: TypeKit[], candidates: Iterable<string>, base: string): Promise<string> {
  const v2 = !kit.v1 || sceneKits.length > 0;
  const components = [kitCss(kit), ...sceneKits.map((k) => kitCss(k, `[data-ct-type="${k.name}"]`))].filter(Boolean).join("\n");
  const input = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);
${themeCss(theme, kit)}
@layer base {${baseCss(!!kit.v1)}}
${v2 ? `@property --tw-tracking { syntax: "*"; inherits: false; }\n@property --tw-leading { syntax: "*"; inherits: false; }\n@layer components {\n${components}\n}\n` : ""}`;
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
