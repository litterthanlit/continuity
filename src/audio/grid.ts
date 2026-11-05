import type { BeatAnalysis, Onset } from "./analyze.js";

/**
 * The music on the video's clock: what the edit cuts on and the motion snaps to. Built from a
 * track's beat analysis and the storyboard's `music` (where the track starts in the video, and
 * where in the track it starts playing). Pure — the build computes it once per project.
 */
export interface MusicGrid {
  bpm: number;
  beatsPerBar: number;
  /** Every beat, video seconds, ascending. */
  beats: number[];
  /** Bar starts (downbeats), video seconds — a subset of `beats`. */
  bars: number[];
  /** Strong percussive hits, video seconds. */
  hits: Onset[];
  /** When the music plays, video seconds: [start, end). */
  span: [number, number];
}

/** A scene's view of the grid: the same points, on the scene's own clock (0 = its first frame). */
export interface SceneMusic {
  /** The video's frame rate: a time on the music lands on its nearest frame. */
  fps: number;
  /** The scene's start on the video's clock: a beat lands on the video's frame nearest it. */
  start: number;
  bpm: number;
  beatsPerBar: number;
  beats: number[];
  bars: number[];
  hits: Onset[];
}

/** Onsets at least this strong (0..1 of the track's strongest) count as hits. */
export const HIT_STRENGTH = 0.35;
/**
 * A time this close to a grid point is on it: half a frame at 24fps, the coarsest rate. A cut
 * lands on the frame nearest its beat, so up to half a frame after it; a quarter-frame tolerance
 * lost the scene's beat 0 to the next beat whenever the frame fell later than that.
 */
export const ON_GRID = 1 / 48;

export interface MusicPlacement {
  /** Video time the track starts playing. */
  start: number;
  /** Track time at that moment. */
  offset: number;
}

export function musicGrid(a: BeatAnalysis, at: MusicPlacement): MusicGrid {
  const shift = at.start - at.offset;
  const end = at.start + Math.max(0, a.duration - at.offset);
  const inSpan = (t: number) => t >= at.start - ON_GRID && t < end;
  return {
    bpm: a.bpm,
    beatsPerBar: a.beatsPerBar,
    beats: a.beats.map((t) => r4(t + shift)).filter(inSpan),
    bars: a.downbeats.map((t) => r4(t + shift)).filter(inSpan),
    hits: a.onsets.filter((o) => o.strength >= HIT_STRENGTH).map((o) => ({ ...o, t: r4(o.t + shift) })).filter((o) => inSpan(o.t)),
    span: [at.start, r4(end)],
  };
}

/**
 * The time of point `n` (fractional between points) of an ascending list, extrapolated past
 * either end at the list's median spacing — a scene timed in beats may run past the track.
 */
export function pointAt(points: number[], n: number, fallbackStep: number): number {
  if (!points.length) return r4(n * fallbackStep);
  const step = medianStep(points) ?? fallbackStep;
  if (n <= 0) return r4(points[0] + n * step);
  const last = points.length - 1;
  if (n >= last) return r4(points[last] + (n - last) * step);
  const i = Math.floor(n);
  return r4(points[i] + (points[i + 1] - points[i]) * (n - i));
}

/** Index (fractional) of time `t` among `points`: the inverse of pointAt. */
export function indexAt(points: number[], t: number, fallbackStep: number): number {
  if (!points.length) return t / fallbackStep;
  const step = medianStep(points) ?? fallbackStep;
  if (t <= points[0]) return (t - points[0]) / step;
  const last = points.length - 1;
  if (t >= points[last]) return last + (t - points[last]) / step;
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid] <= t) lo = mid;
    else hi = mid;
  }
  return lo + (t - points[lo]) / (points[hi] - points[lo]);
}

/** The first point at or after `t` (within ON_GRID), as an index. */
export function firstIndexFrom(points: number[], t: number, fallbackStep: number): number {
  return Math.ceil(indexAt(points, t - ON_GRID, fallbackStep) - 1e-9);
}

/**
 * The frame nearest `t`, as a time no later than that frame's own: a cut, or a move, on the music
 * shows on the frame nearest its beat. Halfway between two frames (an eighth at 120 bpm, 30fps) it
 * takes the earlier: sound a little after picture reads as in sync, before it does not
 * (ITU-R BT.1359). Rounding to 4 decimals could land just after the frame (62/30 → 2.0667) and
 * show it a frame late, so it rounds down.
 */
export function onFrame(t: number, fps: number): number {
  const frame = Math.ceil(t * fps - 0.5 - 1e-9);
  return Math.floor((frame / fps) * 10000 + 1e-6) / 10000;
}

/** The scene's slice of the grid, re-clocked to the scene. Points from just before its start (a frame) are kept. */
export function sceneMusic(g: MusicGrid, start: number, duration: number, fps: number): SceneMusic {
  const local = (t: number) => r4(t - start);
  const within = (t: number) => t >= start - ON_GRID && t <= start + duration + ON_GRID;
  return {
    fps,
    start,
    bpm: g.bpm,
    beatsPerBar: g.beatsPerBar,
    beats: g.beats.filter(within).map(local),
    bars: g.bars.filter(within).map(local),
    hits: g.hits.filter((h) => within(h.t)).map((h) => ({ ...h, t: local(h.t) })),
  };
}

/** A moment on the music counted from a start (0-based): the Nth beat (fractional = between beats), bar, or hit. */
export type OnMusic = { beat: number } | { bar: number } | { hit: number };

/**
 * Time of a music moment counted from `from` (the first point at or after it is 0), on the
 * grid's clock. Beats and bars extrapolate past the track at its tempo; hits do not exist past it.
 */
export function musicAt(g: Pick<MusicGrid, "beats" | "bars" | "hits" | "beatsPerBar">, on: OnMusic, from: number, beatStep: number): number | undefined {
  if ("hit" in on) return g.hits.filter((h) => h.t >= from - ON_GRID)[on.hit]?.t;
  const bars = "bar" in on;
  const pts = bars ? g.bars : g.beats;
  const step = bars ? beatStep * g.beatsPerBar : beatStep;
  return pointAt(pts, firstIndexFrom(pts, from, step) + (bars ? on.bar : on.beat), step);
}

/** The point of `points` nearest to `t`, or undefined when there are none. */
export function nearest(points: number[], t: number): number | undefined {
  let best: number | undefined;
  for (const p of points) if (best === undefined || Math.abs(p - t) < Math.abs(best - t)) best = p;
  return best;
}

function medianStep(points: number[]): number | undefined {
  if (points.length < 2) return undefined;
  const d = points.slice(1).map((p, i) => p - points[i]).sort((a, b) => a - b);
  return d[Math.floor(d.length / 2)];
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;
