import type { BuildResult } from "../../build/build.js";
import { resolveScene } from "../../motion/evaluate.js";

export interface TimePoint {
  /** Global seconds. */
  t: number;
  scene: string;
  label: string;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function sceneOf(build: BuildResult, t: number): string {
  const scenes = build.timeline!.scenes;
  let id = scenes[0].scene;
  for (const s of scenes) if (t >= s.start - 1e-6) id = s.scene;
  return id;
}

/**
 * One "hero" frame per scene: the moment its entrances have settled and before
 * anything leaves. This is the frame a designer would screenshot for review.
 */
export function keyTimes(build: BuildResult): TimePoint[] {
  const out: TimePoint[] = [];
  for (const sc of build.timeline!.scenes) {
    const resolved = resolveScene(sc, build.partsEstimate);
    let settle = 0;
    for (const r of resolved) {
      if (r.kind === "enter" || (r.kind === "transition" && r.start < sc.duration / 2)) settle = Math.max(settle, r.start + r.duration);
    }
    // The scene "leaves" at its outgoing transition, or when the stage starts clearing
    // after everything has landed. Exits of transient elements (a caret, a tooltip)
    // that happen before the last entrance settles don't count.
    let leave = sc.duration;
    for (const r of resolved) {
      const outgoing = r.kind === "transition" && r.start >= sc.duration / 2;
      if (outgoing || (r.kind === "exit" && r.start >= settle - 0.01)) leave = Math.min(leave, r.start);
    }
    let t = settle > 0 ? settle + 0.1 : sc.duration / 2;
    if (t > leave - 0.05) t = Math.max(0, leave - 0.05);
    out.push({ t: r3(sc.start + Math.min(t, sc.duration - 0.05)), scene: sc.scene, label: "settled" });
  }
  return out;
}

/** A frame shortly after each storyboard beat (when its motion has mostly landed). */
export function beatTimes(build: BuildResult, after = 0.5): TimePoint[] {
  const out: TimePoint[] = [];
  for (const sc of build.timeline!.scenes) {
    for (const [id, at] of Object.entries(sc.beats)) {
      out.push({ t: r3(sc.start + Math.min(at + after, sc.duration - 0.05)), scene: sc.scene, label: id });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Evenly spaced frames across the video (or one scene). */
export function gridTimes(build: BuildResult, every: number, scene?: string): TimePoint[] {
  const tl = build.timeline!;
  const sc = scene ? tl.scenes.find((s) => s.scene === scene) : undefined;
  if (scene && !sc) throw new Error(`unknown scene "${scene}"`);
  const start = sc ? sc.start : 0;
  const end = sc ? sc.start + sc.duration : tl.duration;
  const out: TimePoint[] = [];
  for (let t = start + every / 2; t < end - 1e-6; t += every) {
    const g = r3(t);
    out.push({ t: g, scene: sceneOf(build, g), label: "" });
  }
  return out;
}

/** Tween boundaries (start, settle) — where layout should be audited. Capped for speed. */
export function auditTimes(build: BuildResult, max = 40): number[] {
  const set = new Set<number>();
  const tl = build.timeline!;
  for (const sc of tl.scenes) {
    for (const r of resolveScene(sc, build.partsEstimate)) {
      if (r.kind === "transition") continue;
      const end = sc.start + r.start + r.duration + 0.04;
      if (end < tl.duration) set.add(r3(end));
    }
    set.add(r3(sc.start + sc.duration / 2));
  }
  for (const k of keyTimes(build)) set.add(k.t);
  let list = [...set].sort((a, b) => a - b);
  if (list.length > max) {
    const step = list.length / max;
    list = Array.from({ length: max }, (_, i) => list[Math.floor(i * step)]);
  }
  return list;
}

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}
