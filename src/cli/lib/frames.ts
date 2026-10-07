import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildDir } from "../../paths.js";
import { runHf } from "./hf.js";

export interface Frame {
  t: number;
  file: string;
}

/**
 * Capture full-resolution frames at exact times through HyperFrames' own
 * seek + capture path (what you see is what renders).
 */
export async function captureFrames(slug: string, times: number[], outDir: string, prefix = "t"): Promise<Frame[]> {
  if (!times.length) return [];
  mkdirSync(outDir, { recursive: true });
  const tmp = join(outDir, ".snap");
  rmSync(tmp, { recursive: true, force: true });
  const uniq = [...new Set(times.map((t) => Math.round(t * 1000) / 1000))].sort((a, b) => a - b);
  const r = await runHf(["snapshot", buildDir(slug), "--at", uniq.join(","), "--no-end", "-o", tmp], { timeoutMs: 10 * 60_000 });
  if (r.code !== 0 || !existsSync(tmp)) throw new Error(`hyperframes snapshot failed:\n${r.stdout.slice(-1500)}\n${r.stderr.slice(-1500)}`);
  const files = readdirSync(tmp).filter((f) => /^frame-\d+-at-[\d.]+s\.png$/.test(f));
  const out: Frame[] = [];
  for (const f of files) {
    const t = Number(/at-([\d.]+)s\.png$/.exec(f)![1]);
    const nearest = uniq.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
    const dest = join(outDir, `${prefix}-${nearest.toFixed(3)}.png`);
    copyFileSync(join(tmp, f), dest);
    out.push({ t: nearest, file: dest });
  }
  rmSync(tmp, { recursive: true, force: true });
  return out.sort((a, b) => a.t - b.t);
}
