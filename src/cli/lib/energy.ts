import type { BuildResult } from "../../build/build.js";
import type { Finding } from "../../spec/findings.js";
import { ffmpeg } from "./ffmpeg.js";
import { fmtTime } from "./times.js";

export interface EnergyCurve {
  fps: number;
  /** [time, energy] per frame; energy = mean luminance of the frame difference (0–255), downscaled. */
  points: Array<[number, number]>;
  baseline: number;
}

/** Frame-to-frame change across the encoded video — the edit's motion "cardiogram". */
export async function energyCurve(file: string): Promise<EnergyCurve> {
  const r = await ffmpeg([
    "-v", "error", "-i", file,
    "-vf", "scale=320:-2,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
    "-f", "null", "-",
  ]);
  const text = r.stdout + r.stderr;
  const points: Array<[number, number]> = [];
  let t = 0;
  for (const line of text.split("\n")) {
    const m = /pts_time:([\d.]+)/.exec(line);
    if (m) t = Number(m[1]);
    const y = /YAVG=([\d.]+)/.exec(line);
    if (y) points.push([t, Number(y[1])]);
  }
  const sorted = points.map((p) => p[1]).sort((a, b) => a - b);
  const baseline = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const fps = points.length > 1 ? Math.round(1 / (points[1][0] - points[0][0])) : 30;
  return { fps, points, baseline };
}

export interface EnergyAnalysis {
  deadZones: Array<[number, number]>;
  spikes: number[];
  findings: Finding[];
  stats: { mean: number; peak: number; activeShare: number };
}

/**
 * Dead zones: long stretches with no visible change. Spikes: single-frame jolts
 * that aren't scene cuts — flicker, pops, or a hard jump in an animation.
 */
export function analyzeEnergy(curve: EnergyCurve, build: BuildResult): EnergyAnalysis {
  const tl = build.timeline!;
  const findings: Finding[] = [];
  const still = Math.max(0.12, curve.baseline * 1.8);
  const deadZones: Array<[number, number]> = [];
  let runStart: number | null = null;
  for (const [t, e] of curve.points) {
    if (e <= still) {
      if (runStart === null) runStart = t;
    } else if (runStart !== null) {
      if (t - runStart >= 1.8) deadZones.push([runStart, t]);
      runStart = null;
    }
  }
  const end = curve.points[curve.points.length - 1]?.[0] ?? 0;
  if (runStart !== null && end - runStart >= 1.8) deadZones.push([runStart, end]);

  const cuts = tl.scenes.slice(1).map((s) => s.start);
  const starts = tl.scenes.flatMap((s) => s.tweens.map((t) => s.start + t.start));
  // Transitions also land hard on purpose (a punch-cut flash dies in two frames).
  const ends = tl.scenes.flatMap((s) => s.tweens.filter((t) => t.kind === "transition").map((t) => s.start + t.start + t.duration));
  const vals = curve.points.map((p) => p[1]);
  const median = [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)] ?? 0;
  const spikes: number[] = [];
  for (let i = 1; i < curve.points.length - 1; i++) {
    const [t, e] = curve.points[i];
    const neighbours = (curve.points[i - 1][1] + curve.points[i + 1][1]) / 2;
    const isolated = e > Math.max(4, median * 8) && e > neighbours * 3;
    const explained = [...cuts, ...starts, ...ends].some((c) => Math.abs(c - t) < 1.5 / curve.fps);
    if (isolated && !explained) spikes.push(t);
  }

  for (const [a, b] of deadZones) {
    // Holds at the very end (end card) are expected; inside the edit they are dead air.
    const atEnd = b >= end - 0.05;
    findings.push({
      source: "render",
      rule: "motion-dead-zone",
      severity: atEnd && b - a < 3 ? "info" : "warning",
      time: Math.round(a * 100) / 100,
      message: `no visible change for ${(b - a).toFixed(2)}s (${fmtTime(a)}–${fmtTime(b)})`,
      suggestion: "add ambient life (camera drift, bg/glow loop) or tighten the hold",
    });
  }
  for (const t of spikes) {
    findings.push({
      source: "render",
      rule: "motion-spike",
      severity: "warning",
      time: Math.round(t * 1000) / 1000,
      message: `single-frame jolt at ${fmtTime(t)} not explained by a cut or a tween start (flicker/pop?)`,
      suggestion: "inspect with `ct stills --at` around this time",
    });
  }
  const mean = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length);
  const peak = Math.max(0, ...vals);
  const activeShare = vals.filter((v) => v > still).length / Math.max(1, vals.length);
  return { deadZones, spikes, findings, stats: { mean, peak, activeShare } };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** SVG/HTML chart: energy curve with scene bands, beats, cuts and dead zones. */
export function energyHtml(curve: EnergyCurve, an: EnergyAnalysis, build: BuildResult, title: string): string {
  const tl = build.timeline!;
  const W = 1536;
  const H = 360;
  const padL = 48;
  const padB = 56;
  const plotW = W - padL - 16;
  const plotH = H - padB - 20;
  const dur = tl.duration;
  const peak = Math.max(1, ...curve.points.map((p) => p[1]));
  const x = (t: number) => padL + (t / dur) * plotW;
  const y = (e: number) => 20 + plotH - (Math.sqrt(e) / Math.sqrt(peak)) * plotH;
  const path = curve.points.map(([t, e], i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(e).toFixed(1)}`).join(" ");
  const area = `${path} L${x(curve.points[curve.points.length - 1]?.[0] ?? dur).toFixed(1)},${20 + plotH} L${padL},${20 + plotH} Z`;
  const bands = tl.scenes
    .map((s, i) => {
      const x0 = x(s.start);
      const x1 = x(Math.min(dur, s.start + s.duration));
      return `<rect x="${x0}" y="20" width="${x1 - x0}" height="${plotH}" fill="${i % 2 ? "#ffffff08" : "#ffffff03"}"/>` +
        `<text x="${x0 + 6}" y="${20 + plotH + 22}" fill="#a8a8b0" font-size="13">${esc(s.scene)}</text>`;
    })
    .join("");
  const beats = tl.scenes
    .flatMap((s) => Object.entries(s.beats).map(([k, v]) => ({ k, t: s.start + v })))
    .map((b) => `<line x1="${x(b.t)}" x2="${x(b.t)}" y1="20" y2="${20 + plotH}" stroke="#8b7bff55" stroke-dasharray="3 4"/><text x="${x(b.t) + 3}" y="34" fill="#8b7bffaa" font-size="11">${esc(b.k)}</text>`)
    .join("");
  const dead = an.deadZones.map(([a, b]) => `<rect x="${x(a)}" y="20" width="${x(b) - x(a)}" height="${plotH}" fill="#ff5d5d22" stroke="#ff5d5d66"/>`).join("");
  const spikes = an.spikes.map((t) => `<circle cx="${x(t)}" cy="26" r="5" fill="#f6c343"/>`).join("");
  const ticks = Array.from({ length: Math.floor(dur) + 1 }, (_, i) => `<text x="${x(i)}" y="${H - 8}" fill="#6b6b76" font-size="11" text-anchor="middle">${i}s</text>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#0c0c0e;color:#e8e8ea;font-family:ui-monospace,monospace;padding:16px;width:${W}px}h1{font-size:15px;margin:0 0 4px}p{font-size:12px;color:#8b8b93;margin:0 0 10px}</style></head><body>
<h1>${esc(title)}</h1>
<p>motion energy (frame-to-frame change) · mean ${an.stats.mean.toFixed(2)} · active ${(an.stats.activeShare * 100).toFixed(0)}% of frames · red = dead zones · yellow = unexplained single-frame jolts · dashed = beats</p>
<svg width="${W}" height="${H}" font-family="ui-monospace,monospace">${bands}${dead}${beats}
<path d="${area}" fill="#8b7bff22"/><path d="${path}" fill="none" stroke="#b9afff" stroke-width="1.5"/>${spikes}${ticks}</svg>
</body></html>`;
}
