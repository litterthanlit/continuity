import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NODE_MODULES } from "../../paths.js";
import { fmtTime } from "./times.js";

/** Max long edge for images handed to a vision model (larger gets downscaled anyway). */
export const MAX_SHEET_WIDTH = 1568;

let monoFont: string | null = null;
function monoFace(): string {
  if (!monoFont) {
    const b64 = readFileSync(join(NODE_MODULES, "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2")).toString("base64");
    monoFont = `@font-face{font-family:"CT Mono";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:100 900;}`;
  }
  return monoFont;
}

export interface SheetCell {
  /** Image path relative to the page's base directory. */
  src: string;
  time?: number;
  scene?: string;
  label?: string;
  /** Draw a colored ring (e.g. findings at this time). */
  flag?: "error" | "warning";
}

export interface SheetOptions {
  title: string;
  meta?: string;
  cells: SheetCell[];
  cols: number;
  /** width / height of each frame */
  aspect: number;
  /** Overlay a 6×6 anchor grid (A–F columns, 1–6 rows) for precise critique. */
  anchors?: boolean;
  width?: number;
  footer?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function anchorOverlay(): string {
  const cols = "ABCDEF";
  let lines = "";
  for (let i = 1; i < 6; i++) {
    lines += `<i style="left:${(i * 100) / 6}%;top:0;bottom:0;width:1px"></i><i style="top:${(i * 100) / 6}%;left:0;right:0;height:1px"></i>`;
  }
  let labels = "";
  for (let c = 0; c < 6; c++)
    for (let r = 0; r < 6; r++)
      labels += `<b style="left:calc(${(c * 100) / 6}% + 3px);top:calc(${(r * 100) / 6}% + 2px)">${cols[c]}${r + 1}</b>`;
  return `<div class="anc">${lines}${labels}</div>`;
}

export function sheetHtml(o: SheetOptions): string {
  const width = Math.min(o.width ?? MAX_SHEET_WIDTH, MAX_SHEET_WIDTH);
  const gap = 8;
  const pad = 16;
  const cellW = Math.floor((width - pad * 2 - gap * (o.cols - 1)) / o.cols);
  const cellH = Math.round(cellW / o.aspect);
  const cells = o.cells
    .map((c) => {
      const ring = c.flag === "error" ? "box-shadow:0 0 0 3px #ff5d5d" : c.flag === "warning" ? "box-shadow:0 0 0 3px #f6c343" : "";
      const cap = [c.time !== undefined ? fmtTime(c.time) : "", c.scene ?? "", c.label ?? ""].filter(Boolean).join(" · ");
      return `<figure><div class="img" style="height:${cellH}px;${ring}"><img src="${esc(c.src)}">${o.anchors ? anchorOverlay() : ""}</div><figcaption>${esc(cap)}</figcaption></figure>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${monoFace()}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${width}px;background:#0c0c0e;color:#e8e8ea;font-family:"CT Mono",ui-monospace,monospace;padding:${pad}px}
header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;gap:16px}
h1{font-size:15px;font-weight:600;letter-spacing:.02em}
.meta{font-size:11px;color:#8b8b93}
.grid{display:grid;grid-template-columns:repeat(${o.cols},${cellW}px);gap:${gap + 6}px ${gap}px}
figure{width:${cellW}px}
.img{position:relative;width:${cellW}px;border-radius:4px;overflow:hidden;background:#000}
.img img{display:block;width:100%;height:100%;object-fit:cover}
figcaption{font-size:11px;color:#a8a8b0;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.anc{position:absolute;inset:0}
.anc i{position:absolute;background:rgba(255,64,160,.55)}
.anc b{position:absolute;font-size:9px;font-weight:600;color:#ff40a0;text-shadow:0 0 2px #000}
footer{margin-top:12px;font-size:11px;color:#8b8b93;white-space:pre-wrap}
</style></head><body>
<header><h1>${esc(o.title)}</h1><span class="meta">${esc(o.meta ?? "")}</span></header>
<div class="grid">${cells}</div>
${o.footer ? `<footer>${esc(o.footer)}</footer>` : ""}
</body></html>`;
}

/** Columns that keep a sheet ≤ MAX_SHEET_WIDTH and frames legible. */
export function defaultCols(aspect: number): number {
  if (aspect >= 1.5) return 4;
  if (aspect >= 0.95) return 5;
  return 6;
}
