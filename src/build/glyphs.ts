import * as fontkit from "fontkit";
import { resolveDep } from "../paths.js";
import type { FontFamily } from "../themes/fonts.js";

type Font = { hasGlyphForCodePoint(cp: number): boolean };
const cache = new Map<string, Font>();

function open(file: string): Font {
  let f = cache.get(file);
  if (!f) {
    f = fontkit.openSync(resolveDep(file)) as unknown as Font;
    cache.set(file, f);
  }
  return f;
}

/**
 * Characters in `text` that no vendored face can draw. Those would fall back to
 * a system font — a different look on every machine — so the build rejects them.
 */
export function missingGlyphs(text: string, families: FontFamily[]): string[] {
  const fonts = families.flatMap((fam) => fam.faces.map((face) => open(face.file)));
  const missing = new Set<string>();
  for (const ch of new Set(Array.from(text))) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x21 || ch.trim() === "" || (cp >= 0xfe00 && cp <= 0xfe0f) || cp === 0x200d) continue;
    if (!fonts.some((f) => f.hasGlyphForCodePoint(cp))) missing.add(ch);
  }
  return [...missing];
}
