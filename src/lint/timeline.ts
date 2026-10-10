import type { BuildResult, ElementInfo } from "../build/build.js";
import { isLinear, peakSlope } from "../motion/easing.js";
import { resolveScene } from "../motion/evaluate.js";
import { TOKEN_TOLERANCE, durations, eases, readTime } from "../motion/tokens.js";
import { TRANSITION_DEFS } from "../motion/transitions.js";
import { SPATIAL_PROPS, type PropName, type SceneTimeline, type Tween } from "../motion/types.js";
import type { Finding, Severity } from "../spec/findings.js";
import { ASPECTS, sceneTimings, type Storyboard } from "../spec/storyboard.js";

/**
 * Timeline lint — measures motion quality structurally, on data.
 *
 * Vision models are poor judges of motion (timing, easing, settle), so these
 * rules encode the craft directly: everything eases, nothing is interrupted
 * before it settles, text stays long enough to be read, the frame never goes
 * dead, and the eye is never asked to follow too many things at once.
 */

export const RULES = {
  "ease-linear": "Spatial motion with a linear ease looks mechanical. Use a token ease (enter/exit/standard/hero/inOut or a spring).",
  "duration-too-fast": "Spatial entrances/exits under 150ms read as glitches.",
  "duration-too-slow": "Entrances/exits/emphasis over 1.6s drag. Split it, or make it a camera move.",
  "duration-off-token": "Durations should come from the token scale (instant/fast/base/slow/hero/linger) for a consistent rhythm.",
  "exit-slower-than-enter": "Exits should be quicker than entrances (attention has moved on).",
  "settle-interrupted": "A new tween on the same property starts before the previous one settled — motion never lands.",
  "read-time": "Text must stay long enough to read — ≈17 chars/s + 0.4s (min 0.83s) counted from when it starts appearing — and hold ≥ 0.6s once fully landed.",
  "hold-too-short": "Element exits almost as soon as it lands.",
  "ui-glance": "UI mockup text should be fully landed for ≥ 0.8s so it registers (it is imagery, not copy — no full read time needed).",
  "scene-overrun": "Motion is still running after the scene has ended (it will be cut off).",
  "late-entrance": "Element enters in the last moments of the scene — it pops in and is gone.",
  "dead-air": "Nothing moves for too long. Add ambient life (camera drift, a loop on bg/glow) or tighten the scene.",
  "crowded": "Too many independent elements animating at once — the eye can't follow.",
  "unstaggered-group": "Several elements enter with the same preset at the same instant. Stagger them to create hierarchy.",
  "slow-open": "The video's first motion starts late — the opening frame is dead.",
  "split-too-busy": "Character split on long copy is slow and noisy. Split by words or lines instead.",
  "stagger-too-long": "The stagger cascade takes too long to complete.",
  "camera-too-fast": "Camera moves faster than ~15% zoom/s or 160px/s feel jarring.",
  "transition-too-long": "A transition longer than its type's craft range stalls the edit (a 0.8s whip is no longer a whip).",
  "transition-too-short": "A transition shorter than its type's range reads as a glitch, not a move.",
  "transition-language": "More than two transition types in one video reads as a template. Pick one primary (most cuts) and at most one accent; hard cuts are free.",
  "transition-bounce": "Spring overshoot on a full-frame scene move looks cheap. Use a bezier ease (inOut, sharp, standard).",
  "transition-strobe": "A fast push without motion blur jumps over 200px a frame and strobes. Add blur: true, or use whip.",
  "mask-needs-split": "Mask presets reveal from behind a clip edge — use split (words/lines) or wrap the element in an overflow-hidden parent.",
  "cut-off-beat": "Scene cut is not on the music grid (bpm).",
  "axis-reflow": "Weight/width animation changes letter widths: wrapping text re-breaks its lines mid-motion. Split chars/words, or keep the line nowrap.",
  "axis-unsupported": "The element's family has no such axis, so the channel animates nothing (e.g. wdth on Geist, soft outside Fraunces).",
  "axis-range": "Axis values outside what the family can draw are clamped: the motion flatlines at the end of its range.",
  "hairline-weight": "Serif type below weight 300 shimmers after video compression.",
} as const;
export type RuleId = keyof typeof RULES;

interface Span {
  tween: Tween;
  index: number;
  start: number;
  end: number;
  /** end of the last split part */
  lastEnd: number;
}

function spans(scene: SceneTimeline, parts: BuildResult["partsEstimate"]): Span[] {
  const resolved = resolveScene(scene, parts);
  const bySource = new Map<number, { start: number; end: number }>();
  for (const r of resolved) {
    const s = bySource.get(r.source);
    const end = r.start + r.duration;
    if (!s) bySource.set(r.source, { start: r.start, end });
    else {
      s.start = Math.min(s.start, r.start);
      s.end = Math.max(s.end, end);
    }
  }
  return scene.tweens.map((t, index) => {
    const s = bySource.get(index) ?? { start: t.start, end: t.start + t.duration };
    return { tween: t, index, start: t.start, end: t.start + t.duration, lastEnd: s.end };
  });
}

const near = (d: number) => Object.values(durations).some((v) => Math.abs(d - v) <= v * TOKEN_TOLERANCE);
const isSpatial = (t: Tween) => Object.keys(t.props).some((p) => SPATIAL_PROPS.has(p as PropName));
const localOf = (id: string) => id.slice(id.indexOf(".") + 1);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function lintTimeline(build: BuildResult): Finding[] {
  const out: Finding[] = [];
  const tl = build.timeline;
  if (!tl) return out;
  const elements = new Map(build.elements.map((e) => [e.id, e]));
  const add = (rule: RuleId, severity: Severity, sc: SceneTimeline, msg: string, extra: Partial<Finding> = {}) => {
    const f: Finding = { source: "lint", rule, severity, scene: sc.scene, message: msg, ...extra };
    if (f.time === undefined && extra.data?.localTime !== undefined) f.time = r2(sc.start + Number(extra.data.localTime));
    out.push(f);
  };
  const allowed = (t: Tween, rule: RuleId) => t.allow?.includes(rule) ?? false;

  let firstMotion = Infinity;

  for (const sc of tl.scenes) {
    const ss = spans(sc, build.partsEstimate);
    const at = (local: number) => r2(sc.start + local);

    for (const s of ss) {
      const t = s.tween;
      const where = { element: t.target, time: at(t.start) };
      if (t.kind === "enter") firstMotion = Math.min(firstMotion, sc.start + t.start);

      if (isSpatial(t) && isLinear(t.ease) && t.kind !== "transition" && !allowed(t, "ease-linear")) {
        add("ease-linear", "warning", sc, `${localOf(t.target)}: ${Object.keys(t.props).join("+")} moves at constant speed`, {
          ...where,
          suggestion: t.kind === "camera" ? 'use ease "inOut" or "standard"' : 'use a token ease, e.g. ease: "enter" / "standard" / "snappy"',
        });
      }
      if ((t.kind === "enter" || t.kind === "exit") && isSpatial(t) && t.duration < 0.15 && !allowed(t, "duration-too-fast")) {
        add("duration-too-fast", "warning", sc, `${localOf(t.target)} ${t.kind} takes ${t.duration}s`, { ...where, suggestion: 'use duration "fast" (0.24s) or longer' });
      }
      if ((t.kind === "enter" || t.kind === "exit" || t.kind === "emphasis") && !t.counter && t.duration > 1.6 && !allowed(t, "duration-too-slow")) {
        add("duration-too-slow", "warning", sc, `${localOf(t.target)} ${t.kind} takes ${t.duration}s`, { ...where, suggestion: "keep entrances ≤ hero (0.9s); use camera/loops for slow drift" });
      }
      if (
        (t.kind === "enter" || t.kind === "exit" || t.kind === "move") &&
        t.ease.type !== "spring" &&
        t.duration > 0.05 &&
        t.duration < 1.6 &&
        !near(t.duration) &&
        !allowed(t, "duration-off-token")
      ) {
        add("duration-off-token", "info", sc, `${localOf(t.target)} uses ${t.duration}s (not on the token scale)`, { ...where, suggestion: "prefer instant/fast/base/slow/hero" });
      }
      if (s.lastEnd > sc.duration + 0.01 && t.kind !== "transition" && !allowed(t, "scene-overrun")) {
        add("scene-overrun", "error", sc, `${localOf(t.target)} ${t.kind} ends at ${r2(s.lastEnd)}s but the scene is ${sc.duration}s`, {
          ...where,
          suggestion: "start it earlier, shorten it/the stagger, or lengthen the scene",
        });
      }
      if (t.kind === "enter" && t.start > sc.duration - 0.45 && !allowed(t, "late-entrance")) {
        add("late-entrance", "warning", sc, `${localOf(t.target)} enters ${r2(sc.duration - t.start)}s before the scene ends`, where);
      }
      if (t.split === "chars") {
        const n = build.partsEstimate[t.target]?.chars ?? 0;
        if (n > 48 && !allowed(t, "split-too-busy")) add("split-too-busy", "warning", sc, `${localOf(t.target)} splits ${n} characters`, { ...where, suggestion: 'use split: "words" or "lines"' });
      }
      if (t.split && t.stagger && s.lastEnd - s.end > 1.4 && !allowed(t, "stagger-too-long")) {
        add("stagger-too-long", "warning", sc, `${localOf(t.target)} cascade lasts ${r2(s.lastEnd - t.start)}s`, { ...where, suggestion: "tighten the stagger or split by a coarser unit" });
      }
      const font = elements.get(t.target)?.font;
      const axes = (Object.keys(t.props) as PropName[]).filter((p) => p === "wght" || p === "wdth" || p === "opsz" || p === "soft");
      if (font && axes.length) {
        for (const p of axes) {
          const range = font.ranges[p];
          const [from, to] = t.props[p]!;
          if (!range) {
            if (!allowed(t, "axis-unsupported")) add("axis-unsupported", "warning", sc, `${localOf(t.target)}: ${font.family} has no ${p} axis — this tween animates nothing`, { ...where, suggestion: "use a kit whose family has the axis (flexion/broadside for wdth, wonk for soft)" });
          } else if ([from, to].some((v) => v !== null && (v < range[0] - 0.01 || v > range[1] + 0.01)) && !allowed(t, "axis-range")) {
            add("axis-range", "info", sc, `${localOf(t.target)}: ${p} ${from ?? "…"}→${to} leaves ${font.family}'s ${range[0]}–${range[1]}`, { ...where, suggestion: `keep ${p} within ${range[0]}–${range[1]}` });
          }
        }
        const words = (elements.get(t.target)?.text ?? "").split(" ").filter(Boolean).length;
        if ((axes.includes("wght") || axes.includes("wdth")) && !t.split && !font.nowrap && words >= 2 && !allowed(t, "axis-reflow")) {
          add("axis-reflow", "warning", sc, `${localOf(t.target)}: ${axes.filter((p) => p === "wght" || p === "wdth").join("+")} on wrapping text re-breaks lines mid-motion`, { ...where, suggestion: 'split: "chars" or "words", or add whitespace-nowrap' });
        }
        const settle = t.props.wght?.[1];
        if (settle !== undefined && settle < 300 && font.category === "serif" && !allowed(t, "hairline-weight")) {
          add("hairline-weight", "warning", sc, `${localOf(t.target)}: ${font.family} settles at weight ${settle}`, { ...where, suggestion: "keep serif type at 300+ (400+ for small sizes)" });
        }
      }
      if (t.preset && (t.preset === "maskUp" || t.preset === "maskDown" || t.preset === "maskOut") && !t.split && !allowed(t, "mask-needs-split")) {
        add("mask-needs-split", "info", sc, `${localOf(t.target)} uses ${t.preset} without split`, { ...where, suggestion: 'add split: "lines" (or wrap it in an overflow-hidden parent)' });
      }
      if (t.kind === "camera") {
        const ds = Math.abs((t.props.scale?.[1] ?? 1) - (t.props.scale?.[0] ?? 1)) / Math.max(0.01, t.duration);
        const dx = Math.max(Math.abs((t.props.x?.[1] ?? 0) - (t.props.x?.[0] ?? 0)), Math.abs((t.props.y?.[1] ?? 0) - (t.props.y?.[0] ?? 0))) / Math.max(0.01, t.duration);
        if ((ds > 0.15 || dx > 160) && !allowed(t, "camera-too-fast")) {
          add("camera-too-fast", "warning", sc, `camera moves ${ds > 0.15 ? r2(ds * 100) + "% zoom/s" : Math.round(dx) + "px/s"}`, { ...where, suggestion: "slow it down or make it a deliberate cut" });
        }
      }
    }

    // Same element + same prop: the next tween must not start before the previous settles.
    const byChannel = new Map<string, Span[]>();
    for (const s of ss) {
      if (s.tween.kind === "transition") continue;
      for (const p of Object.keys(s.tween.props)) {
        const k = `${s.tween.target}|${p}`;
        (byChannel.get(k) ?? byChannel.set(k, []).get(k)!).push(s);
      }
    }
    const reported = new Set<string>();
    for (const [k, list] of byChannel) {
      list.sort((a, b) => a.start - b.start);
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        const cur = list[i];
        const samePreset = prev.tween.preset && prev.tween.preset === cur.tween.preset && prev.tween.kind === "emphasis";
        if (samePreset) continue;
        const overlap = prev.lastEnd - cur.start;
        const key = `${cur.tween.target}@${cur.start}`;
        if (overlap > 0.02 && !reported.has(key) && !allowed(cur.tween, "settle-interrupted")) {
          reported.add(key);
          add("settle-interrupted", "error", sc, `${localOf(cur.tween.target)}: ${cur.tween.kind} starts ${r2(overlap)}s before its ${prev.tween.kind} settles (${k.split("|")[1]})`, {
            element: cur.tween.target,
            time: at(cur.start),
            suggestion: `start the ${cur.tween.kind} at or after ${r2(prev.lastEnd)}s (e.g. at: "after:${localOf(cur.tween.target)}")`,
          });
        }
      }
    }

    // Visibility windows → read time & hold. Viewers read reveals as they happen,
    // so reading starts when the first part becomes legible (~30% into it), and
    // the complete line must also be seen settled for a moment.
    const enterEnd = new Map<string, number>();
    const firstReadable = new Map<string, number>();
    const exitStart = new Map<string, number>();
    for (const s of ss) {
      const t = s.tween;
      const incoming = t.kind === "enter" || (t.kind === "transition" && t.start < sc.duration / 2);
      const outgoing = t.kind === "exit" || (t.kind === "transition" && t.start >= sc.duration / 2);
      if (incoming) {
        enterEnd.set(t.target, Math.max(enterEnd.get(t.target) ?? 0, s.lastEnd));
        const fr = t.start + t.duration * 0.3;
        firstReadable.set(t.target, Math.max(firstReadable.get(t.target) ?? 0, fr));
      }
      if (outgoing) exitStart.set(t.target, Math.min(exitStart.get(t.target) ?? Infinity, t.start));
    }
    const textLeaf = (e: ElementInfo) => !e.decor && e.role !== "decor" && e.ownText.replace(/[\s\d.,%+$€£-]/g, "").length >= 2;
    const counted = new Set(sc.tweens.filter((t) => t.counter).map((t) => t.target));
    const SETTLED_HOLD = 0.6;
    for (const e of build.elements) {
      if (e.scene !== sc.scene || !textLeaf(e) || counted.has(e.id)) continue;
      // Part of a larger copy element (e.g. an accent word inside a headline): judged with its parent.
      if (e.ancestors.some((a) => elements.get(a) && !elements.get(a)!.ui && textLeaf(elements.get(a)!))) continue;
      const chain = [e.id, ...e.ancestors];
      const readable = Math.max(0, ...chain.map((id) => firstReadable.get(id) ?? 0));
      const landed = Math.max(0, ...chain.map((id) => enterEnd.get(id) ?? 0));
      const until = Math.min(sc.duration, ...chain.map((id) => exitStart.get(id) ?? Infinity));
      if (e.ui) {
        if (until - landed < 0.8) {
          add("ui-glance", "warning", sc, `UI text "${e.ownText.slice(0, 40)}" is landed for only ${r2(Math.max(0, until - landed))}s`, {
            element: e.id,
            time: at(landed),
            suggestion: "land it earlier or hold the scene longer",
          });
        }
        continue;
      }
      const window = until - readable;
      const need = readTime(e.text.length);
      const quote = `"${e.text.slice(0, 48)}${e.text.length > 48 ? "…" : ""}"`;
      if (window < need) {
        add("read-time", "error", sc, `${quote} is on screen for ${r2(Math.max(0, window))}s of reading, needs ~${r2(need)}s`, {
          element: e.id,
          time: at(readable),
          suggestion: `start it earlier, exit later, shorten the copy, or lengthen the scene by ${r2(need - window)}s`,
        });
      } else if (until - landed < SETTLED_HOLD) {
        add("read-time", "error", sc, `${quote} is fully landed for only ${r2(Math.max(0, until - landed))}s before it leaves`, {
          element: e.id,
          time: at(landed),
          suggestion: `let it hold ≥ ${SETTLED_HOLD}s after the last part lands (tighten the stagger or start earlier)`,
        });
      }
    }
    for (const [id, end] of enterEnd) {
      const ex = exitStart.get(id);
      const e = elements.get(id);
      if (ex === undefined || !e || textLeaf(e)) continue;
      if (ex - end < 0.3) {
        add("hold-too-short", "warning", sc, `${localOf(id)} holds for only ${r2(Math.max(0, ex - end))}s`, { element: id, time: at(end) });
      }
    }

    // Dead air: windows with no tween in flight and no loop/camera covering them.
    const active: Array<[number, number]> = ss.map((s) => [s.start, s.lastEnd]);
    for (const l of sc.loops) active.push([l.start, l.end ?? sc.duration]);
    active.sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    const gaps: Array<[number, number]> = [];
    for (const [s, e] of active) {
      if (s > cursor) gaps.push([cursor, s]);
      cursor = Math.max(cursor, e);
    }
    if (cursor < sc.duration) gaps.push([cursor, sc.duration]);
    for (const [a, b] of gaps) {
      const len = b - a;
      if (len > 2.5) add("dead-air", "warning", sc, `nothing moves for ${r2(len)}s (${r2(a)}–${r2(b)}s)`, { time: at(a), suggestion: 'm.camera({ scale: [1, 1.03] }) or m.loop("bg", { scale: 0.02 }, { period: 8 })' });
      else if (len > 1.6) add("dead-air", "info", sc, `static for ${r2(len)}s (${r2(a)}–${r2(b)}s)`, { time: at(a) });
    }

    // Crowding: distinct targets with spatial enters in flight at once.
    const enters = ss.filter((s) => s.tween.kind === "enter" && isSpatial(s.tween));
    let worst = { n: 0, t: 0 };
    for (const s of enters) {
      const t = s.start + 0.01;
      const n = new Set(enters.filter((o) => o.start <= t && o.lastEnd > t).map((o) => o.tween.group ?? o.tween.target)).size;
      if (n > worst.n) worst = { n, t };
    }
    if (worst.n > 5) add("crowded", "warning", sc, `${worst.n} independent elements/groups are mid-entrance at ${r2(worst.t)}s`, { time: at(worst.t), suggestion: "stagger, group into one container, or move some to a later beat" });

    // Unstaggered groups.
    const groups = new Map<string, Span[]>();
    for (const s of ss) {
      if (s.tween.kind !== "enter" || s.tween.split) continue;
      const k = `${s.tween.preset ?? "custom"}@${s.start}`;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(s);
    }
    for (const [, list] of groups) {
      const targets = new Set(list.map((s) => s.tween.target));
      if (targets.size >= 3) {
        add("unstaggered-group", "warning", sc, `${targets.size} elements (${[...targets].map(localOf).join(", ")}) enter at the same instant`, {
          time: at(list[0].start),
          suggestion: 'pass them as one array: m.enter([a, b, c], "rise", { stagger: "list" })',
        });
      }
    }
  }

  if (Number.isFinite(firstMotion) && firstMotion > 0.6) {
    const sc = tl.scenes[0];
    add("slow-open", "warning", sc, `first entrance starts at ${r2(firstMotion)}s`, { time: r2(firstMotion), suggestion: "start the first motion within 0.1–0.4s" });
  }

  if (build.storyboard) out.push(...lintStoryboard(build.storyboard, tl));

  const bpm = build.storyboard?.bpm;
  if (bpm) {
    const beat = 60 / bpm;
    for (const sc of tl.scenes.slice(1)) {
      const off = sc.start / beat - Math.round(sc.start / beat);
      if (Math.abs(off * beat) > 1 / tl.fps) add("cut-off-beat", "info", sc, `scene starts ${r2(off * beat)}s off the ${bpm} bpm grid`, { time: sc.start });
    }
  }
  return out;
}

/**
 * Storyboard-level rules: the edit's transition language and each transition's
 * craft range. Runs on the storyboard alone (`ct lint --storyboard`), so
 * directors see it before any scene exists.
 */
export function lintStoryboard(sb: Storyboard, frame?: { width: number; height: number; fps: number }): Finding[] {
  const out: Finding[] = [];
  const { width, height } = frame ?? ASPECTS[sb.format.aspect];
  const fps = frame?.fps ?? sb.format.fps;
  const timings = sceneTimings(sb).scenes;
  const types: string[] = [];
  const strobing: string[] = [];
  sb.scenes.forEach((sc, i) => {
    const t = sc.transition;
    if (!t || t.type === "cut" || i === sb.scenes.length - 1) return;
    const def = TRANSITION_DEFS[t.type];
    const at = r2(timings[i].start + sc.duration - t.duration);
    const where = { source: "lint" as const, scene: sc.id, time: at };
    const kind = t.type === "pushUp" ? "push" : t.type;
    if (!types.includes(kind)) {
      types.push(kind);
      if (types.length === 3) {
        out.push({ ...where, rule: "transition-language", severity: "warning", message: `a third transition type (${t.type}) after ${types.slice(0, 2).join(" and ")}`, suggestion: "keep one primary transition and one accent; cut everything else" });
      }
    }
    if (t.duration > def.range[1] + 1e-6) {
      out.push({ ...where, rule: "transition-too-long", severity: "warning", message: `${t.type} lasts ${t.duration}s (craft range ${def.range[0]}–${def.range[1]}s)`, suggestion: `use ≤ ${def.range[1]}s` });
    } else if (t.duration < def.range[0] - 1e-6) {
      out.push({ ...where, rule: "transition-too-short", severity: "warning", message: `${t.type} lasts ${t.duration}s (craft range ${def.range[0]}–${def.range[1]}s)`, suggestion: `use ≥ ${def.range[0]}s, or a hard cut` });
    }
    const ease = typeof t.ease === "string" ? eases[t.ease] : undefined;
    if (ease && ease.type === "spring" && ease.damping / (2 * Math.sqrt(ease.stiffness * ease.mass)) < 0.7) {
      out.push({ ...where, rule: "transition-bounce", severity: "warning", message: `${t.type} uses the springy "${t.ease}" ease — the whole frame overshoots`, suggestion: 'use "inOut", "sharp" or "standard"' });
    }
    if ((t.type === "push" || t.type === "pushUp" || t.type === "whip") && !t.blur && (t.type !== "whip" || t.blur === false)) {
      const vertical = t.type === "pushUp" || t.dir === "up" || t.dir === "down";
      const curve = typeof t.ease === "string" ? eases[t.ease] : t.ease ? { type: "bezier" as const, p: t.ease } : t.type === "whip" ? eases.sharp : eases.inOut;
      const v = (peakSlope(curve) * (vertical ? height : width)) / Math.max(1e-3, t.duration * fps);
      if (v > 200) strobing.push(`${sc.id} (${Math.round(v)}px/frame)`);
    }
  });
  if (strobing.length) {
    out.push({
      source: "lint",
      rule: "transition-strobe",
      severity: "info",
      scene: sb.scenes[0].id,
      message: `${strobing.length} push${strobing.length > 1 ? "es" : ""} without motion blur peak above 200px a frame: ${strobing.join(", ")}`,
      suggestion: "add blur: true to the push (or use whip)",
    });
  }
  return out;
}
