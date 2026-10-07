/**
 * Vendored font registry. Every face is a local woff2 from an @fontsource
 * package (SIL OFL 1.1), copied into each build and declared with @font-face —
 * no network at render time, identical metrics on every machine.
 */
export interface FontFaceFile {
  /** Path relative to the repo's node_modules. */
  file: string;
  weight: string;
  style: "normal" | "italic";
}

export interface FontFamily {
  family: string;
  faces: FontFaceFile[];
  fallback: string;
  license: string;
}

const variable = (pkg: string, base: string, family: string, fallback: string, italic = true): FontFamily => ({
  family,
  fallback,
  license: "OFL-1.1",
  faces: [
    { file: `@fontsource-variable/${pkg}/files/${base}-latin-wght-normal.woff2`, weight: "100 900", style: "normal" },
    ...(italic
      ? [{ file: `@fontsource-variable/${pkg}/files/${base}-latin-wght-italic.woff2`, weight: "100 900", style: "italic" as const }]
      : []),
  ],
});

export const fonts = {
  geist: variable("geist", "geist", "Geist", "ui-sans-serif, system-ui, sans-serif"),
  geistMono: variable("geist-mono", "geist-mono", "Geist Mono", "ui-monospace, monospace"),
  inter: variable("inter", "inter", "Inter", "ui-sans-serif, system-ui, sans-serif"),
  interTight: variable("inter-tight", "inter-tight", "Inter Tight", "ui-sans-serif, system-ui, sans-serif"),
  instrumentSerif: {
    family: "Instrument Serif",
    fallback: "ui-serif, Georgia, serif",
    license: "OFL-1.1",
    faces: [
      { file: "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
      { file: "@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
    ],
  },
} satisfies Record<string, FontFamily>;

export type FontKey = keyof typeof fonts;

const single = (family: string, file: string): FontFamily => ({
  family,
  fallback: "",
  license: "OFL-1.1",
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
