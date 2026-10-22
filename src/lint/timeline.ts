import type { BuildResult, ElementInfo } from "../build/build.js";
import { isLinear, peakSlope } from "../motion/easing.js";
import { resolveScene } from "../motion/evaluate.js";
import { REGISTER_BOUNDS, registerOf, type Register } from "../motion/register.js";
import { EXIT_FACTOR, TOKEN_TOLERANCE, TRAVEL, bounceOf, durations, eases, readTime } from "../motion/tokens.js";
import { WEIGHTS } from "../themes/kits.js";
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
 * dead, and the eye is never asked to follow too many things at once. The litt
 * rules (docs/decisions/0006) gate the taste: springs within litt's bounce,
 * one expressive moment per scene, material static, transform and opacity only.
 * Each scene is judged in its register (docs/decisions/0007): the energetic
 * register widens the motion bounds (bounce, travel, camera, budget) and adds
 * its own rule (copy types or wipes on); material and settling never relax.
 */

export const RULES = {
  "ease-linear": "Spatial motion with a linear ease looks mechanical. Use a token ease (the responsive or expressive spring, out, inOut, steep). Energetic register: linear rotation is fine for a machine (a spinning ring).",
  "duration-too-fast": "Spatial entrances/exits under 150ms read as glitches.",
  "duration-too-slow": "Entrances/exits/emphasis over 1.6s drag. Split it, or make it a camera move.",
  "duration-off-token": "Durations should come from the token scale (instant/responsive/expressive/exit/slow/linger, snap in the energetic register) for a consistent rhythm.",
  "exit-slower-than-enter": "Exits should be quicker than entrances (attention has moved on).",
  "settle-interrupted": "A new tween on the same property starts before the previous one settled — motion never lands.",
  "read-time": "Text must stay long enough to read — ≈17 chars/s + 0.4s (min 0.83s) counted from when it starts appearing — and hold ≥ 0.6s once fully landed.",
  "hold-too-short": "Element exits almost as soon as it lands.",
  "ui-glance": "UI mockup text should be fully landed for ≥ 0.8s so it registers (it is imagery, not copy — no full read time needed).",
  "scene-overrun": "Motion is still running after the scene has ended (it will be cut off).",
  "late-entrance": "Element enters in the last moments of the scene — it pops in and is gone.",
  "dead-air": "Nothing moves for too long. Let the camera carry the hold (a push of 3% or less) or tighten the scene.",
  "crowded": "Too many independent elements animating at once — the eye can't follow (calm: 5, energetic: 7).",
  "unstaggered-group": "Several elements enter with the same preset at the same instant. Stagger them to create hierarchy.",
  "slow-open": "The video's first motion starts late — the opening frame is dead.",
  "split-too-busy": "Character split on long copy is slow and noisy. Split by words or lines instead.",
  "stagger-too-long": "The stagger cascade takes too long to complete.",
  "camera-too-fast": "Camera moves faster than ~15% zoom/s or 160px/s feel jarring (energetic register: 50% zoom/s, 480px/s).",
  "transition-too-long": "A transition longer than its type's craft range stalls the edit (a 1s push is no longer a step).",
  "transition-too-short": "A transition shorter than its type's range reads as a glitch, not a move.",
  "transition-language": "More than two accent transition types in one video reads as a template (three once any scene is energetic). Pick one primary (most cuts) and few accents; hard cuts are free.",
  "transition-register": "This transition belongs to another register (e.g. depth is energetic). Set the scene's register, or pick a transition from its own.",
  "transition-bounce": "Spring overshoot on a full-frame scene move looks cheap. Use a bezier ease (inOut, out).",
  "transition-strobe": "A fast push without motion blur jumps over 200px a frame and strobes. Add blur: true, or lengthen it.",
  "mask-needs-split": "Mask presets reveal from behind a clip edge — use split (words/lines) or wrap the element in an overflow-hidden parent.",
  "cut-off-beat": "Scene cut is not on the music grid (bpm).",
  "axis-reflow": "Weight/width animation changes letter widths: wrapping text re-breaks its lines mid-motion. Split chars/words, or keep the line nowrap.",
  "axis-unsupported": "The element's family has no such axis, so the channel animates nothing (e.g. wdth or soft on Geist, which has a weight axis only).",
  "axis-range": "Axis values outside what the family can draw are clamped: the motion flatlines at the end of its range.",
  "spring-bounce": "litt: a spring bounces at 0.12 or less (the expressive tier). More reads as a toy. Energetic register: up to 0.35, for things that act like objects (the pop spring).",
  "exit-bounce": "litt: exits never bounce. They ease out at 0.75× the entrance (the exit presets do it).",
  "expressive-budget": "litt: one expressive moment per scene (the statement, or the product placed). Every other entrance is responsive. Energetic register: up to three (a group counts once).",
  "material-motion": "litt P5: material is static. The backdrop, the light, glow and grain never animate, loop or sweep.",
  "property-motion": "litt: transform and opacity animate, plus ink at the instant tier, masks and data (draw, counter). Tracking, weight, blur and filters perform.",
  "travel-too-far": "litt: entrances travel 32px (litt's 16 at video scale). Further reads as thrown, not placed. Energetic register: collage pieces may land from up to 160px.",
  "camera-drift": "The ambient camera push stays within 3% over its scene: it is the only ambient life, and it must not be noticed (energetic register: 8%).",
  "ambient-loop": "litt: motion that is not a response never performs. No loops (floating cards, breathing glows); the camera's slow push is the ambient life. A caret blink is fine (m.blink). Energetic register: an info — an object may spin or swing (a ring, a keychain), never copy.",
  "text-fade": "Energetic register: copy never just fades in. It types on (m.type) or wipes on like a selection (wipeRight, or the selection-block recipe).",
  "weight-role": "litt P9: three weights by role — 400 text, 500 titles, 600 labels. A weight tween settles on one of them.",
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

/** The token scale, plus the exits the presets derive from it (0.75 × each spring's visual time). */
const ON_SCALE = [...Object.values(durations), EXIT_FACTOR * durations.responsive, EXIT_FACTOR * durations.expressive];
const near = (d: number) => ON_SCALE.some((v) => Math.abs(d - v) <= v * TOKEN_TOLERANCE);
/** Channels litt lets move: transform and opacity, ink, masks and clips, and data. */
const LITT_PROPS = new Set<PropName>([...SPATIAL_PROPS, "opacity", "ink", "clipTop", "clipRight", "clipBottom", "clipLeft", "fx", "draw", "counter", "blurX", "blurY"]);
const isSpatial = (t: Tween) => Object.keys(t.props).some((p) => SPATIAL_PROPS.has(p as PropName));
const ROTATION = new Set<string>(["rotate", "rotateX", "rotateY"]);
/** Only rotation moves: a machine turning (a spinning ring), not a thing travelling. */
const isRotation = (t: Tween) => Object.keys(t.props).filter((p) => SPATIAL_PROPS.has(p as PropName)).every((p) => ROTATION.has(p));
/** Copy (not UI imagery) with readable words of its own. */
const isCopy = (e: ElementInfo | undefined) => !!e && !e.ui && !e.decor && e.role !== "decor" && e.ownText.replace(/[\s\d.,%+$€£-]/g, "").length >= 2;
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
    const register: Register = registerOf(build.storyboard, sc.scene);
    const B = REGISTER_BOUNDS[register];
    const inRegister = register === "calm" ? "" : ` (${register} register)`;

    for (const s of ss) {
      const t = s.tween;
      const where = { element: t.target, time: at(t.start) };
      if (t.kind === "enter") firstMotion = Math.min(firstMotion, sc.start + t.start);

      if (isSpatial(t) && isLinear(t.ease) && t.kind !== "transition" && !(B.linearRotation && isRotation(t)) && !allowed(t, "ease-linear")) {
        add("ease-linear", "warning", sc, `${localOf(t.target)}: ${Object.keys(t.props).join("+")} moves at constant speed`, {
          ...where,
          suggestion: t.kind === "camera" ? 'use ease "inOut"' : 'use a token ease: "responsive" (the default spring), "expressive" or "out"',
        });
      }
      if ((t.kind === "enter" || t.kind === "exit") && isSpatial(t) && t.duration < 0.15 && !allowed(t, "duration-too-fast")) {
        add("duration-too-fast", "warning", sc, `${localOf(t.target)} ${t.kind} takes ${t.duration}s`, { ...where, suggestion: "use the responsive spring (the preset default) or the exit presets' derived timing" });
      }
      if ((t.kind === "enter" || t.kind === "exit" || t.kind === "emphasis") && !t.counter && t.duration > 1.6 && !allowed(t, "duration-too-slow")) {
        add("duration-too-slow", "warning", sc, `${localOf(t.target)} ${t.kind} takes ${t.duration}s`, { ...where, suggestion: "entrances are springs (≈0.35s responsive, ≈0.58s expressive); slow drift belongs to the camera" });
      }
      if (
        (t.kind === "enter" || t.kind === "exit" || t.kind === "move") &&
        t.ease.type !== "spring" &&
        t.duration > 0.05 &&
        t.duration < 1.6 &&
        !near(t.duration) &&
        !allowed(t, "duration-off-token")
      ) {
        add("duration-off-token", "info", sc, `${localOf(t.target)} uses ${t.duration}s (not on the token scale)`, { ...where, suggestion: "prefer instant/responsive/expressive/exit/slow/snap, or a spring ease" });
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
            if (!allowed(t, "axis-unsupported")) add("axis-unsupported", "warning", sc, `${localOf(t.target)}: ${font.family} has no ${p} axis — this tween animates nothing`, { ...where, suggestion: "Geist has a weight axis only; litt ranks by ink (m.emphasize(id, \"ink\")), not by axes" });
          } else if ([from, to].some((v) => v !== null && (v < range[0] - 0.01 || v > range[1] + 0.01)) && !allowed(t, "axis-range")) {
            add("axis-range", "info", sc, `${localOf(t.target)}: ${p} ${from ?? "…"}→${to} leaves ${font.family}'s ${range[0]}–${range[1]}`, { ...where, suggestion: `keep ${p} within ${range[0]}–${range[1]}` });
          }
        }
        const words = (elements.get(t.target)?.text ?? "").split(" ").filter(Boolean).length;
        if ((axes.includes("wght") || axes.includes("wdth")) && !t.split && !font.nowrap && words >= 2 && !allowed(t, "axis-reflow")) {
          add("axis-reflow", "warning", sc, `${localOf(t.target)}: ${axes.filter((p) => p === "wght" || p === "wdth").join("+")} on wrapping text re-breaks lines mid-motion`, { ...where, suggestion: 'split: "chars" or "words", or add whitespace-nowrap' });
        }
        const settle = t.props.wght?.[1];
        if (settle !== undefined && !(Object.values(WEIGHTS) as number[]).includes(settle) && !allowed(t, "weight-role")) {
          add("weight-role", "warning", sc, `${localOf(t.target)}: weight settles at ${settle}`, { ...where, suggestion: "settle on 400 (text), 500 (title) or 600 (label)" });
        }
      }
      if (t.preset && (t.preset === "maskUp" || t.preset === "maskDown" || t.preset === "maskOut") && !t.split && !allowed(t, "mask-needs-split")) {
        add("mask-needs-split", "info", sc, `${localOf(t.target)} uses ${t.preset} without split`, { ...where, suggestion: 'add split: "lines" (or wrap it in an overflow-hidden parent)' });
      }
      if (t.kind !== "transition") {
        const bounce = bounceOf(t.ease);
        if (bounce > B.maxBounce + 1e-3 && !allowed(t, "spring-bounce")) {
          add("spring-bounce", "warning", sc, `${localOf(t.target)}: ${t.easeName ?? "spring"} bounces at ${r2(bounce)}${inRegister}`, {
            ...where,
            suggestion: register === "calm" ? 'use ease "responsive" (bounce 0) or "expressive" (0.12) — or set the scene\'s register to "energetic" if it is a reel' : `keep bounce ≤ ${B.maxBounce} (ease "pop" is 0.3)`,
          });
        }
        if (t.kind === "exit" && bounce > 1e-3 && !allowed(t, "exit-bounce")) {
          add("exit-bounce", "warning", sc, `${localOf(t.target)} exits on a spring that bounces`, { ...where, suggestion: 'use an exit preset (ease "out" at 0.75× the entrance)' });
        }
        if (localOf(t.target) === "bg" && !allowed(t, "material-motion")) {
          add("material-motion", "error", sc, `the backdrop animates (${Object.keys(t.props).join("+")})`, { ...where, suggestion: "keep the backdrop still; move the camera instead" });
        }
        const off = (Object.keys(t.props) as PropName[]).filter((p) => !LITT_PROPS.has(p));
        if (off.length && !allowed(t, "property-motion")) {
          add("property-motion", "warning", sc, `${localOf(t.target)} animates ${off.join(", ")}`, { ...where, suggestion: "animate transform and opacity; emphasise with ink (m.emphasize(id, \"ink\"))" });
        }
        if (t.props.ink && t.duration > 0.24 && !allowed(t, "property-motion")) {
          add("property-motion", "info", sc, `${localOf(t.target)}: ink fades over ${t.duration}s`, { ...where, suggestion: 'ink steps at the instant tier (duration "instant")' });
        }
      }
      if (t.kind === "enter" && B.textTypesOrWipes && t.preset !== "typeOn" && isCopy(elements.get(t.target)) && Object.keys(t.props).every((p) => p === "opacity" || p === "scale") && !allowed(t, "text-fade")) {
        add("text-fade", "warning", sc, `${localOf(t.target)} fades in${inRegister}`, { ...where, suggestion: 'type it on (m.type) or wipe it on (m.enter(id, "wipeRight", { duration: "snap", ease: "steep" }))' });
      }
      if (t.kind === "enter") {
        const far = Math.max(...(["x", "y"] as const).map((p) => Math.abs(t.props[p]?.[0] ?? 0)));
        if (far > B.maxTravel && !allowed(t, "travel-too-far")) {
          add("travel-too-far", "warning", sc, `${localOf(t.target)} enters from ${far}px away${inRegister}`, { ...where, suggestion: `travel ${TRAVEL}px (the preset default)${register === "calm" ? "" : `, ≤ ${B.maxTravel}px for a piece that lands`}` });
        }
      }
      if (t.kind === "camera") {
        const zoom = Math.abs((t.props.scale?.[1] ?? 1) - (t.props.scale?.[0] ?? 1));
        if (t.duration >= sc.duration * 0.6 && zoom > B.maxDrift + 1e-6 && !allowed(t, "camera-drift")) {
          add("camera-drift", "warning", sc, `the ambient camera zooms ${r2(zoom * 100)}% over the scene${inRegister}`, { ...where, suggestion: `push 1 → ${r2(1 + B.maxDrift)} or less; a deliberate focus move is a short inOut tween` });
        }
        const ds = Math.abs((t.props.scale?.[1] ?? 1) - (t.props.scale?.[0] ?? 1)) / Math.max(0.01, t.duration);
        const dx = Math.max(Math.abs((t.props.x?.[1] ?? 0) - (t.props.x?.[0] ?? 0)), Math.abs((t.props.y?.[1] ?? 0) - (t.props.y?.[0] ?? 0))) / Math.max(0.01, t.duration);
        if ((ds > B.cameraZoomRate || dx > B.cameraPan) && !allowed(t, "camera-too-fast")) {
          add("camera-too-fast", "warning", sc, `camera moves ${ds > B.cameraZoomRate ? r2(ds * 100) + "% zoom/s" : Math.round(dx) + "px/s"}${inRegister}`, { ...where, suggestion: register === "calm" ? "slow it down or make it a deliberate cut" : "slow it down, or make it a depth transition" });
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

    for (const l of sc.loops) {
      if (l.blink) continue;
      if (localOf(l.target) === "bg") add("material-motion", "error", sc, `the backdrop loops (${l.prop})`, { element: l.target, time: at(l.start), suggestion: "remove the loop; the camera's slow push is the ambient life" });
      else if (B.loops === "warning") add("ambient-loop", "warning", sc, `${localOf(l.target)} loops ${l.prop} every ${l.period}s`, { element: l.target, time: at(l.start), suggestion: "remove it; m.camera({ scale: [1, 1.03] }) carries the hold" });
      else add("ambient-loop", "info", sc, `${localOf(l.target)} loops ${l.prop} every ${l.period}s${inRegister}`, { element: l.target, time: at(l.start), suggestion: "fine for an object that spins or swings; never for copy or chrome" });
    }

    // Expressive budget: one expressive moment (a bouncing spring) per scene.
    const moments = new Set(ss.filter((s) => s.tween.kind !== "transition" && s.tween.kind !== "exit" && bounceOf(s.tween.ease) > 1e-3 && !allowed(s.tween, "expressive-budget")).map((s) => s.tween.group ?? s.tween.target));
    if (moments.size > B.moments) {
      add("expressive-budget", "warning", sc, `${moments.size} expressive moments (${[...moments].map(localOf).join(", ")})${inRegister}`, {
        suggestion: B.moments === 1 ? 'keep one; give the rest ease "responsive"' : `keep ${B.moments} or fewer; pass a group as one array so it counts once`,
      });
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
      if (len > 2.5) add("dead-air", "warning", sc, `nothing moves for ${r2(len)}s (${r2(a)}–${r2(b)}s)`, { time: at(a), suggestion: "m.camera({ scale: [1, 1.03] }), or tighten the scene" });
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
    if (worst.n > B.crowded) add("crowded", "warning", sc, `${worst.n} independent elements/groups are mid-entrance at ${r2(worst.t)}s`, { time: at(worst.t), suggestion: "stagger, group into one container, or move some to a later beat" });

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
  const accents = Math.max(...sb.scenes.map((s) => REGISTER_BOUNDS[registerOf(sb, s.id)].accents));
  sb.scenes.forEach((sc, i) => {
    const t = sc.transition;
    if (!t || t.type === "cut" || i === sb.scenes.length - 1) return;
    const def = TRANSITION_DEFS[t.type];
    const at = r2(timings[i].start + sc.duration - t.duration);
    const where = { source: "lint" as const, scene: sc.id, time: at };
    const kind = t.type === "pushUp" ? "push" : t.type;
    if (!types.includes(kind)) {
      types.push(kind);
      if (types.length === accents + 1) {
        out.push({ ...where, rule: "transition-language", severity: "warning", message: `accent transition type ${types.length} (${t.type}) after ${types.slice(0, -1).join(", ")}`, suggestion: `keep one primary transition and at most ${accents === 2 ? "one accent" : `${accents - 1} accents`}; cut everything else` });
      }
    }
    const own = [registerOf(sb, sc.id), registerOf(sb, sb.scenes[i + 1].id)];
    if (def.registers && !own.some((r) => def.registers!.includes(r))) {
      out.push({ ...where, rule: "transition-register", severity: "warning", message: `${t.type} is a ${def.registers.join("/")} transition, but ${sc.id} and ${sb.scenes[i + 1].id} are ${own[0]}`, suggestion: `set "register": "${def.registers[0]}" on the storyboard or one of these scenes, or use a cut, dip or push` });
    }
    if (t.duration > def.range[1] + 1e-6) {
      out.push({ ...where, rule: "transition-too-long", severity: "warning", message: `${t.type} lasts ${t.duration}s (craft range ${def.range[0]}–${def.range[1]}s)`, suggestion: `use ≤ ${def.range[1]}s` });
    } else if (t.duration < def.range[0] - 1e-6) {
      out.push({ ...where, rule: "transition-too-short", severity: "warning", message: `${t.type} lasts ${t.duration}s (craft range ${def.range[0]}–${def.range[1]}s)`, suggestion: `use ≥ ${def.range[0]}s, or a hard cut` });
    }
    const ease = typeof t.ease === "string" ? eases[t.ease] : undefined;
    if (ease && ease.type === "spring" && bounceOf(ease) > 0) {
      out.push({ ...where, rule: "transition-bounce", severity: "warning", message: `${t.type} uses the springy "${t.ease}" ease — the whole frame overshoots`, suggestion: 'use "inOut" or "out"' });
    }
    if ((t.type === "push" || t.type === "pushUp") && !t.blur) {
      const vertical = t.type === "pushUp" || t.dir === "up" || t.dir === "down";
      const curve = typeof t.ease === "string" ? eases[t.ease] : t.ease ? { type: "bezier" as const, p: t.ease } : eases.inOut;
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
      suggestion: "add blur: true to the push, or lengthen it",
    });
  }
  return out;
}
