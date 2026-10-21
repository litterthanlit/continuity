/**
 * Vendored font registry. Every face is a local woff2 from an @fontsource
 * package (SIL OFL 1.1), copied into each build and declared with @font-face —
 * no network at render time, identical metrics on every machine.
 *
 * Fallbacks are generic families only — naming a system font (e.g. Georgia)
 * makes HyperFrames' compiler fetch a substitute from Google Fonts at render
 * time, which is network-dependent.
 *
 * `axes`, `tnum` and the weight/stretch ranges describe what the vendored file
 * really contains (tests/fonts.test.ts reads the files to keep them honest).
 */
export type Axis = "wght" | "wdth" | "opsz" | "SOFT" | "WONK";

export interface FontFaceFile {
  /** Package path, resolved with resolveDep (e.g. "@fontsource/x/files/x-latin-400-normal.woff2"). */
  file: string;
  /** CSS font-weight descriptor: "400" or a variable range "100 900". */
  weight: string;
  style: "normal" | "italic";
  /** CSS font-stretch descriptor for width-variable files, e.g. "62% 125%". */
  stretch?: string;
}

export interface FontFamily {
  family: string;
  faces: FontFaceFile[];
  fallback: string;
  license: string;
  category: "sans" | "serif" | "mono" | "symbol";
  /** Variation axes present in the vendored files, as [min, max]. */
  axes: Partial<Record<Axis, [number, number]>>;
  /** Has the OpenType `tnum` feature (tabular figures). Monospace faces are tabular anyway. */
  tnum: boolean;
}

/** fontsource-variable file flavours: which axes a file carries. */
type VariableFile = "wght" | "opsz" | "wdth" | "standard" | "full";

function fontsourceVariable(o: {
  pkg: string;
  base?: string;
  family: string;
  fallback: string;
  category: FontFamily["category"];
  file: VariableFile;
  weight: [number, number];
  stretch?: [number, number];
  axes?: FontFamily["axes"];
  italic: boolean;
  tnum: boolean;
}): FontFamily {
  const base = o.base ?? o.pkg;
  const face = (style: "normal" | "italic"): FontFaceFile => ({
    file: `@fontsource-variable/${o.pkg}/files/${base}-latin-${o.file}-${style}.woff2`,
    weight: `${o.weight[0]} ${o.weight[1]}`,
    style,
    ...(o.stretch ? { stretch: `${o.stretch[0]}% ${o.stretch[1]}%` } : {}),
  });
  return {
    family: o.family,
    fallback: o.fallback,
    license: "OFL-1.1",
    category: o.category,
    axes: { wght: o.weight, ...(o.stretch ? { wdth: o.stretch } : {}), ...o.axes },
    tnum: o.tnum,
    faces: [face("normal"), ...(o.italic ? [face("italic")] : [])],
  };
}

const sans = "sans-serif";

/** litt: Geist and Geist Mono, nothing else (docs/decisions/0006). */
export const fonts = {
  geist: fontsourceVariable({ pkg: "geist", family: "Geist", fallback: sans, category: "sans", file: "wght", weight: [100, 900], italic: true, tnum: true }),
  geistMono: fontsourceVariable({ pkg: "geist-mono", family: "Geist Mono", fallback: "monospace", category: "mono", file: "wght", weight: [100, 900], italic: true, tnum: false }),
} satisfies Record<string, FontFamily>;

export type FontKey = keyof typeof fonts;

const single = (family: string, file: string): FontFamily => ({
  family,
  fallback: "",
  license: "OFL-1.1",
  category: "symbol",
  axes: {},
  tnum: false,
  faces: [{ file, weight: "400", style: "normal" }],
});

/**
 * Deterministic symbol fallbacks appended to every font stack. Without them,
 * glyphs like ✓ ❯ ◆ ⌘ → silently render in whatever system font the machine
 * has — a different picture on every renderer.
 */
export const symbolFonts: FontFamily[] = [
  single("CT Symbols", "@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff2"),
  single("CT Arrows", "@fontsource/noto-sans-symbols/files/noto-sans-symbols-symbols-400-normal.woff2"),
  single("CT Math", "@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-math-400-normal.woff2"),
];

const byName = new Map<string, FontFamily>(Object.values(fonts).map((f) => [f.family, f]));

/** Registry lookup by CSS family name ("Geist Mono"). */
export function familyByName(name: string): FontFamily | undefined {
  return byName.get(name);
}

/** Tabular figures: the `tnum` feature, or a monospace face. */
export function hasTabularFigures(f: FontFamily): boolean {
  return f.tnum || f.category === "mono";
}
