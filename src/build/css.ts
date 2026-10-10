import { compile } from "@tailwindcss/node";
import { basename } from "node:path";
import { symbolFonts } from "../themes/fonts.js";
import type { FontFamily, Theme } from "../themes/index.js";

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

/** Every vendored family a build needs: the theme's four roles + symbol fallbacks. */
export function uniqueFamilies(theme: Theme): FontFamily[] {
  const seen = new Map<string, FontFamily>();
  for (const f of [...Object.values(theme.fonts), ...symbolFonts]) seen.set(f.family, f);
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

function themeCss(theme: Theme): string {
  const colors = Object.entries(theme.colors)
    .map(([k, v]) => `  --color-${k}: ${v};`)
    .join("\n");
  const type = Object.entries(TYPE_SCALE)
    .map(
      ([k, [size, lh, ls]]) =>
        `  --text-${k}: ${size}px;\n  --text-${k}--line-height: ${lh};\n  --text-${k}--letter-spacing: ${ls};`,
    )
    .join("\n");
  return `@theme static {
${colors}
  --font-display: ${stack(theme.fonts.display)};
  --font-sans: ${stack(theme.fonts.sans)};
  --font-mono: ${stack(theme.fonts.mono)};
  --font-serif: ${stack(theme.fonts.serif)};
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

const BASE_CSS = `
html, body { margin: 0; padding: 0; background: var(--color-bg); }
#root { position: relative; overflow: hidden; background: var(--color-bg); color: var(--color-fg);
  font-family: var(--font-sans); -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;
  font-kerning: normal; font-feature-settings: "ss01" on, "cv11" on; }
.ct-scene { position: absolute; inset: 0; overflow: hidden; perspective: 2200px; }
.ct-camera { position: absolute; inset: 0; transform-origin: 50% 50%; }
.ct-measuring .ct-scene { display: block !important; visibility: hidden !important; }
.font-display { font-feature-settings: "ss01" on, "cv11" on, "calt" on; }
`;

/** Tailwind v4 compiled for exactly the classes the rendered HTML uses. */
export async function compileCss(theme: Theme, candidates: Iterable<string>, base: string): Promise<string> {
  const input = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);
${themeCss(theme)}
@layer base {${BASE_CSS}}
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
