import type { PropName } from "../motion/types.js";
import type { Axis, FontFamily } from "../themes/fonts.js";
import type { Role, TypeKit } from "../themes/kits.js";
import { TYPE_SCALE } from "./css.js";

/** Font channels and the variation axis each one drives. */
export const FONT_CHANNELS: Partial<Record<PropName, Axis>> = { wght: "wght", wdth: "wdth", opsz: "opsz", soft: "SOFT" };

export interface TypeBase {
  role: Role;
  family: FontFamily;
  /** Settled values of the font channels (what `from: null` and loops start from). */
  values: Partial<Record<PropName, number>>;
  /** Ranges the family's files can draw, per channel (absent: the channel does nothing). */
  ranges: Partial<Record<PropName, [number, number]>>;
  /** Text can't re-wrap: nowrap / Fit on itself or an ancestor. */
  nowrap: boolean;
}

const WEIGHTS: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

interface Node {
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  parentElement: Node | null;
}

/**
 * The font an element is drawn in, from its classes and its kit — resolved on
 * the static view DOM, the way the cascade will: the nearest weight / stretch
 * utility, role class (font-display/sans/mono/serif) and text size win.
 */
export function typeBaseOf(el: Node, kit: TypeKit): TypeBase {
  let role: Role | undefined;
  let weight: number | undefined;
  let width: number | undefined;
  let size: number | undefined;
  let nowrap = false;
  for (let n: Node | null = el; n; n = n.parentElement) {
    if (n.hasAttribute("data-ct-fit")) nowrap = true;
    for (const c of (n.getAttribute("class") ?? "").split(/\s+/)) {
      const bare = c.replace(/^[a-z-]+:/, "");
      let m: RegExpExecArray | null;
      if (!role && (m = /^font-(display|sans|mono|serif)$/.exec(bare))) role = m[1] as Role;
      else if (weight === undefined && (m = /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.exec(bare))) weight = WEIGHTS[m[1]];
      else if (weight === undefined && (m = /^font-\[(\d+)\]$/.exec(bare))) weight = Number(m[1]);
      else if (width === undefined && (m = /^font-stretch-(\d+(?:\.\d+)?)%$/.exec(bare))) width = Number(m[1]);
      else if (size === undefined && (m = /^text-(mega|display|h1|h2|h3|lead|body|caption|micro)$/.exec(bare))) size = TYPE_SCALE[m[1]][0];
      else if (size === undefined && (m = /^text-\[(\d+(?:\.\d+)?)px\]$/.exec(bare))) size = Number(m[1]);
      else if (/^(whitespace-nowrap|text-nowrap)$/.test(bare)) nowrap = true;
    }
    if (n.getAttribute("data-ct-scene") !== null) break;
  }
  const r = role ?? "sans";
  const style = kit.roles[r];
  const fam = style.family;
  const ranges: TypeBase["ranges"] = {};
  if (fam.axes.wght) ranges.wght = fam.axes.wght;
  if (fam.axes.wdth) ranges.wdth = fam.axes.wdth;
  if (fam.axes.opsz) ranges.opsz = fam.axes.opsz;
  if (fam.axes.SOFT) ranges.soft = fam.axes.SOFT;
  const px = size ?? TYPE_SCALE.body[0];
  const opsz = style.axes?.opsz ?? (fam.axes.opsz ? Math.min(fam.axes.opsz[1], Math.max(fam.axes.opsz[0], px)) : 16);
  return {
    role: r,
    family: fam,
    values: { wght: weight ?? style.weight, wdth: width ?? style.width ?? 100, opsz, soft: style.axes?.SOFT ?? 0 },
    ranges,
    nowrap,
  };
}
