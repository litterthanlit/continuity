import type { BuildResult } from "../../build/build.js";
import { analyzePcm, decodeAudio, type Band } from "../../audio/analyze.js";
import { nearest } from "../../audio/grid.js";
import { isBlurOnly, shownAt } from "../../lint/timeline.js";
import type { Finding } from "../../spec/findings.js";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const BAND_COLOR: Record<Band, string> = { low: "#507afd", mid: "#e19b1b", high: "#2fbfa6" };

/** Where each tween starts relative to the music: on a beat or hit, a near miss, or free. */
export function motionOnGrid(b: BuildResult): Array<{ t: number; target: string; state: "on" | "near" | "free" }> {
  const tl = b.timeline!;
  const grid = b.music!.grid;
  const frame = 1 / tl.fps;
  const points = [...grid.beats, ...grid.hits.map((h) => h.t)];
  return tl.scenes.flatMap((sc) =>
    sc.tweens
      .filter((t) => t.kind !== "transition" && t.kind !== "exit" && !isBlurOnly(t))
      .map((t) => {
        const g = r3(sc.start + t.start);
        const p = nearest(points, g);
        const off = p === undefined ? Infinity : Math.abs(p - g);
        return { t: g, target: t.target, state: off <= frame / 2 + 0.001 ? ("on" as const) : off <= 3 * frame ? ("near" as const) : ("free" as const) };
      }),
  );
}

/** The music chart: waveform, bars and beats, hits by band, the cuts, and where every move starts. */
export function beatsHtml(b: BuildResult, title: string): string {
  const tl = b.timeline!;
  const m = b.music!;
  const g = m.grid;
  const W = 1536;
  const H = 400;
  const padL = 48;
  const plotW = W - padL - 16;
  const top = 24;
  const wave = 180;
  const dur = tl.duration;
  const x = (t: number) => padL + (t / dur) * plotW;
  const frame = 1 / tl.fps;
  const env = m.analysis.envelope;
  const mid = top + wave / 2;
  const peak = Math.max(1e-6, ...env.values);
  const shift = m.spec.start - m.spec.offset;
  const pts = env.values
    .map((v, i) => ({ t: i * env.hop + shift, v }))
    .filter((p) => p.t >= 0 && p.t <= dur);
  const upper = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${(mid - (p.v / peak) * (wave / 2)).toFixed(1)}`).join(" ");
  const lower = [...pts].reverse().map((p) => `L${x(p.t).toFixed(1)},${(mid + (p.v / peak) * (wave / 2)).toFixed(1)}`).join(" ");
  const bars = g.bars.filter((t) => t <= dur).map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${top + wave + 120}" stroke="#f9f8f744"/>`).join("");
  const beats = g.beats.filter((t) => t <= dur).map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${top + wave - 8}" y2="${top + wave + 4}" stroke="#f9f8f788"/>`).join("");
  const hits = g.hits.filter((h) => h.t <= dur).map((h) => `<circle cx="${x(h.t)}" cy="${top + wave + 18}" r="${(2 + h.strength * 4).toFixed(1)}" fill="${BAND_COLOR[h.band]}"/>`).join("");
  const cuts = tl.scenes
    .map((s, i) => {
      const shown = shownAt(s.start, tl.fps);
      const on = i === 0 || Math.abs((nearest(g.beats, shown) ?? Infinity) - shown) <= frame / 2 + 0.001;
      return (
        `<line x1="${x(s.start)}" x2="${x(s.start)}" y1="${top}" y2="${top + wave + 120}" stroke="${on ? "#f9f8f7" : "#ff756f"}" stroke-width="2"/>` +
        `<text x="${x(s.start) + 4}" y="${top + wave + 112}" fill="${on ? "#d6d3d1" : "#ff756f"}" font-size="12">${esc(s.scene)}</text>`
      );
    })
    .join("");
  const STATE = { on: "#5bd68a", near: "#e19b1b", free: "#6b645f" };
  const moves = motionOnGrid(b)
    .map((mv) => `<rect x="${x(mv.t) - 1.5}" y="${top + wave + 40}" width="3" height="${mv.state === "free" ? 10 : 22}" fill="${STATE[mv.state]}"><title>${esc(mv.target)}</title></rect>`)
    .join("");
  const ticks = Array.from({ length: Math.floor(dur) + 1 }, (_, i) => `<text x="${x(i)}" y="${H - 6}" fill="#6b645f" font-size="11" text-anchor="middle">${i}s</text>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#0a0908;color:#f9f8f7;font-family:ui-monospace,monospace;padding:16px;width:${W}px}h1{font-size:15px;margin:0 0 4px}p{font-size:12px;color:#968d86;margin:0 0 10px}</style></head><body>
<h1>${esc(title)}</h1>
<p>${esc(m.spec.src)} · ${g.bpm} bpm · ${g.beatsPerBar}/4 · tall lines = bars, ticks = beats · dots = hits (blue low, amber mid, teal high) · white cuts land on a beat, red ones miss · bottom: where each move starts — green on a beat or hit, amber 1–3 frames off, grey free</p>
<svg width="${W}" height="${H}" font-family="ui-monospace,monospace">${bars}<path d="${upper} ${lower} Z" fill="#507afd33" stroke="#507afd99"/>${beats}${hits}${cuts}${moves}${ticks}</svg>
</body></html>`;
}

/**
 * Picture and sound in the rendered file: its own audio track, analysed again, must carry the
 * music's hits where the timeline put them. A median offset over a frame means the mix slid.
 */
export async function avSync(file: string, b: BuildResult): Promise<{ findings: Finding[]; offset?: number; matched: number }> {
  const tl = b.timeline!;
  const grid = b.music!.grid;
  const frame = 1 / tl.fps;
  let samples: Float32Array;
  try {
    samples = await decodeAudio(file);
  } catch {
    return { matched: 0, findings: [{ source: "render", rule: "audio-missing", severity: "error", message: "the storyboard has music but the rendered file has no audio track" }] };
  }
  const heard = analyzePcm(samples, 22050, { bpm: grid.bpm, beatsPerBar: grid.beatsPerBar });
  const expected = grid.hits.filter((h) => h.t > 0.2 && h.t < tl.duration - 0.2);
  const onsets = heard.onsets.map((o) => o.t);
  const deltas = expected
    .map((h) => {
      const p = nearest(onsets, h.t);
      return p === undefined ? undefined : p - h.t;
    })
    .filter((d): d is number => d !== undefined && Math.abs(d) < 0.1)
    .sort((a, b) => a - b);
  if (!deltas.length) {
    return { matched: 0, findings: [{ source: "render", rule: "av-sync", severity: "error", message: "none of the music's hits were heard in the rendered audio" }] };
  }
  const offset = r3(deltas[Math.floor(deltas.length / 2)]);
  const findings: Finding[] = [];
  const share = deltas.length / Math.max(1, expected.length);
  if (Math.abs(offset) > frame) {
    findings.push({ source: "render", rule: "av-sync", severity: "error", message: `the rendered audio is ${offset}s off the picture (median over ${deltas.length} hits)`, suggestion: "check music.start / music.offset, and that the track has no encoder delay (prefer WAV)" });
  } else {
    findings.push({ source: "render", rule: "av-sync", severity: share < 0.8 ? "warning" : "info", message: `sound on picture: hits ${offset >= 0 ? "+" : ""}${offset}s from where the timeline put them (median of ${deltas.length}/${expected.length})` });
  }
  return { findings, offset, matched: deltas.length };
}
