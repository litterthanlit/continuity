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

function fontsourceStatic(o: {
  pkg: string;
  base?: string;
  family: string;
  fallback: string;
  category: FontFamily["category"];
  weights: number[];
  italic: boolean;
  tnum: boolean;
}): FontFamily {
  const base = o.base ?? o.pkg;
  const styles: Array<"normal" | "italic"> = o.italic ? ["normal", "italic"] : ["normal"];
  return {
    family: o.family,
    fallback: o.fallback,
    license: "OFL-1.1",
    category: o.category,
    axes: {},
    tnum: o.tnum,
    faces: o.weights.flatMap((w) =>
      styles.map((style) => ({ file: `@fontsource/${o.pkg}/files/${base}-latin-${w}-${style}.woff2`, weight: String(w), style })),
    ),
  };
}

const sans = "sans-serif";

export const fonts = {
  // v1 families (paths and descriptors unchanged).
  geist: fontsourceVariable({ pkg: "geist", family: "Geist", fallback: sans, category: "sans", file: "wght", weight: [100, 900], italic: true, tnum: true }),
  geistMono: fontsourceVariable({ pkg: "geist-mono", family: "Geist Mono", fallback: "monospace", category: "mono", file: "wght", weight: [100, 900], italic: true, tnum: false }),
  inter: fontsourceVariable({ pkg: "inter", family: "Inter", fallback: sans, category: "sans", file: "wght", weight: [100, 900], italic: true, tnum: true }),
  interTight: fontsourceVariable({ pkg: "inter-tight", family: "Inter Tight", fallback: sans, category: "sans", file: "wght", weight: [100, 900], italic: true, tnum: true }),
  instrumentSerif: fontsourceStatic({ pkg: "instrument-serif", family: "Instrument Serif", fallback: "serif", category: "serif", weights: [400], italic: true, tnum: false }),

  // v2 kit families.
  newsreader: fontsourceVariable({
    pkg: "newsreader", family: "Newsreader", fallback: "serif", category: "serif",
    file: "standard", weight: [200, 800], axes: { opsz: [6, 72] }, italic: true, tnum: true,
  }),
  instrumentSans: fontsourceVariable({ pkg: "instrument-sans", family: "Instrument Sans", fallback: sans, category: "sans", file: "wght", weight: [400, 700], italic: true, tnum: true }),
  fraunces: fontsourceVariable({
    pkg: "fraunces", family: "Fraunces", fallback: "serif", category: "serif",
    file: "full", weight: [100, 900], axes: { opsz: [9, 144], SOFT: [0, 100], WONK: [0, 1] }, italic: true, tnum: false,
  }),
  hankenGrotesk: fontsourceVariable({ pkg: "hanken-grotesk", family: "Hanken Grotesk", fallback: sans, category: "sans", file: "wght", weight: [100, 900], italic: true, tnum: false }),
  dmMono: fontsourceStatic({ pkg: "dm-mono", family: "DM Mono", fallback: "monospace", category: "mono", weights: [300, 400, 500], italic: true, tnum: false }),
  archivo: fontsourceVariable({
    pkg: "archivo", family: "Archivo", fallback: sans, category: "sans",
    file: "standard", weight: [100, 900], stretch: [62, 125], italic: true, tnum: true,
  }),
  martianMono: fontsourceVariable({
    pkg: "martian-mono", family: "Martian Mono", fallback: "monospace", category: "mono",
    file: "standard", weight: [100, 800], stretch: [75, 112.5], italic: false, tnum: false,
  }),
  monaSans: fontsourceVariable({
    pkg: "mona-sans", family: "Mona Sans", fallback: sans, category: "sans",
    file: "standard", weight: [200, 900], stretch: [75, 125], italic: true, tnum: true,
  }),
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
