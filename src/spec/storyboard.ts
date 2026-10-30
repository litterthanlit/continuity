import { z } from "zod";
import { musicAt, indexAt, pointAt, type MusicGrid, type OnMusic } from "../audio/grid.js";
import { REGISTERS } from "../motion/register.js";
import { eases } from "../motion/tokens.js";
import { DIRS, TRANSITION_DEFS, TRANSITIONS, type TransitionParam } from "../motion/transitions.js";
import { KIT_NAMES } from "../themes/kits.js";

export const ASPECTS = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
} as const;
export type Aspect = keyof typeof ASPECTS;

const id = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "use lowercase kebab-case ids (a-z, 0-9, -), starting with a letter");

/** A moment on the music, counted from the scene's start (0-based): its Nth beat (fractional = between beats), bar, or hit. */
export const OnMusicSchema = z.union([
  z.object({ beat: z.number().min(0) }).strict(),
  z.object({ bar: z.number().min(0) }).strict(),
  z.object({ hit: z.number().int().min(0) }).strict(),
]);

export const BeatSchema = z.object({
  id: z.string().regex(/^[a-z][\w-]*$/i, "beat ids are short words like b1, land, cta"),
  /** Seconds into the scene, or a moment on the music ({ "beat": 2 }, { "bar": 1 }, { "hit": 0 }). */
  at: z.union([z.number().min(0), OnMusicSchema]),
  note: z.string().optional(),
});

/**
 * The soundtrack (docs/decisions/0008). The build analyses it (beats, bars, hits) so scenes can be
 * timed in beats and motion can land on them, and the render mixes it in.
 */
export const MusicSchema = z.object({
  /** Audio file inside the project, e.g. "assets/music.wav" (WAV keeps sample-exact timing). */
  src: z.string().regex(/^(?!\/)(?!.*\.\.)[\w./ -]+$/, "a path inside the project, e.g. assets/music.wav"),
  /** Video time (s) where the track starts playing. */
  start: z.number().min(0).default(0),
  /** Track time (s) at that moment — skip an intro. */
  offset: z.number().min(0).default(0),
  volume: z.number().min(0).max(1).default(1),
  fadeIn: z.number().min(0).max(10).optional(),
  fadeOut: z.number().min(0).max(10).optional(),
  /** Force the tempo when the analysis hears it wrong (half/double time). */
  bpm: z.number().min(40).max(240).optional(),
  /** Force the bar phase: a track time (s) that is a downbeat. */
  downbeat: z.number().min(0).optional(),
  beatsPerBar: z.number().int().min(2).max(12).default(4),
});
export type MusicSpec = z.infer<typeof MusicSchema>;

const PARAMS: readonly TransitionParam[] = ["ease", "dir", "angle", "feather", "blur", "pairs", "squash", "arc"];

/** Transition into the next scene. Parameters are validated per type (TRANSITION_DEFS); duration defaults per type. */
export const TransitionSchema = z
  .object({
    type: z.enum(TRANSITIONS),
    duration: z.number().min(0).max(2).optional(),
    ease: z
      .union([z.enum(Object.keys(eases) as [keyof typeof eases, ...Array<keyof typeof eases>]), z.tuple([z.number(), z.number(), z.number(), z.number()])])
      .optional(),
    dir: z.enum(DIRS).optional(),
    angle: z.number().min(-360).max(360).optional(),
    feather: z.number().min(0).max(50).optional(),
    blur: z.union([z.boolean(), z.number().min(0).max(200)]).optional(),
    pairs: z.array(z.union([z.string().regex(/^[a-z][\w-]*$/i), z.tuple([z.string().regex(/^[a-z][\w-]*$/i), z.string().regex(/^[a-z][\w-]*$/i)])])).min(1).max(4).optional(),
    squash: z.number().min(0).max(0.5).optional(),
    arc: z.number().min(-0.5).max(0.5).optional(),
  })
  .superRefine((t, ctx) => {
    const def = TRANSITION_DEFS[t.type];
    for (const p of PARAMS) {
      if (t[p] !== undefined && !def.params.includes(p)) {
        ctx.addIssue({ code: "custom", path: [p], message: `${t.type} has no "${p}" parameter (it takes: ${def.params.join(", ") || "none"})` });
      }
    }
    if (t.type === "morph" && !t.pairs) {
      ctx.addIssue({ code: "custom", path: ["pairs"], message: 'morph needs the elements that carry the cut: "pairs": ["logo"] or [["title", "card"]]' });
    }
    if (t.dir && def.dirs && !def.dirs.includes(t.dir)) {
      ctx.addIssue({ code: "custom", path: ["dir"], message: `${t.type} runs ${def.dirs.join(" or ")}, not ${t.dir}` });
    }
  })
  .transform((t) => ({ ...t, duration: t.duration ?? TRANSITION_DEFS[t.type].duration }));

export const ElementSchema = z.object({
  id: z.string().regex(/^[a-z][\w-]*$/i),
  role: z
    .enum(["headline", "title", "body", "label", "caption", "cta", "stat", "logo", "ui", "decor", "media"])
    .optional(),
  /** Coarse placement on a 6×6 grid, columns A–F, rows 1–6 (e.g. "B2", "C3:D4"). */
  anchor: z.string().regex(/^[A-F][1-6](:[A-F][1-6])?$/).optional(),
  note: z.string().optional(),
});

export const SceneSchema = z.object({
  id,
  /**
   * Seconds, including any transition overlap into the next scene — or, with music, a span of it:
   * `{ "beats": 8 }` / `{ "bars": 2 }`, so the cut into the next scene lands on that beat.
   */
  duration: z.union([z.number().positive().max(60), z.object({ beats: z.number().positive().max(512) }).strict(), z.object({ bars: z.number().positive().max(128) }).strict()]),
  /** The single thing this scene must make the viewer feel or understand. */
  intent: z.string().min(3),
  beats: z.array(BeatSchema).default([]),
  /** On-screen copy keyed by element id. Views read it as `ctx.text.<id>`. */
  text: z.record(z.string(), z.string()).default({}),
  elements: z.array(ElementSchema).default([]),
  /** Director's motion notes for the builder (presets, rhythm, camera). */
  motion: z.string().optional(),
  /** Transition into the NEXT scene. Omit for a hard cut. */
  transition: TransitionSchema.optional(),
  /** Type kit for this scene only (galleries, a deliberate chapter break). Usually set once at the top. */
  type: z.enum(KIT_NAMES).optional(),
  /** Register for this scene only: one energetic chapter (a montage) in a calm video, or a calm hold in a reel. */
  register: z.enum(REGISTERS).optional(),
});

export const StoryboardSchema = z.object({
  $schema: z.string().optional(),
  title: z.string().min(1),
  /** One-sentence logline: who it's for and what it should make them do. */
  logline: z.string().optional(),
  format: z.object({
    aspect: z.enum(Object.keys(ASPECTS) as [Aspect, ...Aspect[]]),
    fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).default(30),
  }),
  theme: z.string().default("litt-dark"),
  /** Type kit. litt is the only one; a brand theme.ts can pin a defineKit() variant. */
  type: z.enum(KIT_NAMES).optional(),
  /**
   * How loud litt speaks (docs/decisions/0007): `calm` (default — launches, features, statements)
   * or `energetic` (brand reels, montages, collage-led social cuts). The lint's motion bounds follow it.
   */
  register: z.enum(REGISTERS).optional(),
  /** A bare musical grid for cutting on the beat, when there is no `music` to analyse. */
  bpm: z.number().positive().optional(),
  /** The soundtrack: analysed for beats, mixed into the render. */
  music: MusicSchema.optional(),
  scenes: z.array(SceneSchema).min(1),
});

type RawScene = z.infer<typeof SceneSchema>;
/** A story beat with its time resolved to scene seconds (`on`: the music moment it was written as). */
export interface BeatSpec {
  id: string;
  at: number;
  note?: string;
  on?: OnMusic;
}
/** A scene with its duration resolved to seconds (`span`: the music it was timed to). */
export type SceneSpec = Omit<RawScene, "duration" | "beats"> & { duration: number; beats: BeatSpec[]; span?: { beats: number } | { bars: number } };
export type Storyboard = Omit<z.infer<typeof StoryboardSchema>, "scenes"> & { scenes: SceneSpec[] };

export interface SceneTiming {
  id: string;
  start: number;
  duration: number;
  /** Overlap with the next scene (transition length), 0 for cuts. */
  overlapNext: number;
}

/** Global scene start times: each scene starts where the previous one's transition begins. */
export function sceneTimings(sb: Storyboard): { scenes: SceneTiming[]; duration: number } {
  const out: SceneTiming[] = [];
  let t = 0;
  sb.scenes.forEach((s, i) => {
    const isLast = i === sb.scenes.length - 1;
    const overlap = !isLast && s.transition && s.transition.type !== "cut" ? s.transition.duration : 0;
    out.push({ id: s.id, start: round(t), duration: s.duration, overlapNext: overlap });
    t += s.duration - overlap;
  });
  const last = out[out.length - 1];
  return { scenes: out, duration: round(last.start + last.duration) };
}

export function beatsOf(scene: SceneSpec): Record<string, number> {
  return Object.fromEntries(scene.beats.map((b) => [b.id, b.at]));
}

function round(n: number) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Resolve music-timed durations and beats to seconds. A scene timed in beats or bars starts at the
 * grid point nearest its start and ends on the frame nearest the point `n` later, so its cut is on
 * the music.
 */
function resolveTiming(sb: z.infer<typeof StoryboardSchema>, grid: MusicGrid | undefined, issues: string[]): Storyboard {
  const step = 60 / (grid?.bpm ?? sb.bpm ?? 120);
  const fps = sb.format.fps;
  // A cut shows on the first frame at or after the scene's start. Rounding the start to 4 decimals
  // could land it just after its frame (62/30 → 2.0667), so it rounds down onto the frame's time.
  const onFrame = (x: number) => Math.floor((Math.round(x * fps) / fps) * 10000 + 1e-6) / 10000;
  let t = 0;
  const scenes = sb.scenes.map((s, i): SceneSpec => {
    const isLast = i === sb.scenes.length - 1;
    const overlap = !isLast && s.transition && s.transition.type !== "cut" ? s.transition.duration : 0;
    let duration: number;
    if (typeof s.duration === "number") duration = s.duration;
    else if (!grid) {
      issues.push(`scenes.${i}.duration: counts ${"beats" in s.duration ? "beats" : "bars"}, but the storyboard has no music`);
      duration = 1;
    } else {
      const bars = "bars" in s.duration;
      const pts = bars ? grid.bars : grid.beats;
      const each = bars ? step * grid.beatsPerBar : step;
      const k = Math.round(indexAt(pts, t, each));
      duration = round(onFrame(pointAt(pts, k + ("bars" in s.duration ? s.duration.bars : s.duration.beats), each)) - t + overlap);
      if (duration <= overlap) issues.push(`scenes.${i}.duration: ${JSON.stringify(s.duration)} is no time at this point in the music`);
    }
    const start = t;
    const beats = s.beats.map((b, j): BeatSpec => {
      if (typeof b.at === "number") return { id: b.id, at: b.at, ...(b.note ? { note: b.note } : {}) };
      const at = grid ? musicAt(grid, b.at, start, step) : undefined;
      if (at === undefined) {
        issues.push(`scenes.${i}.beats.${j}: ${JSON.stringify(b.at)} — ${grid ? "the music has no such moment in this scene" : "the storyboard has no music"}`);
        return { id: b.id, at: 0, on: b.at };
      }
      return { id: b.id, at: round(Math.max(0, at - start)), on: b.at, ...(b.note ? { note: b.note } : {}) };
    });
    t += duration - overlap;
    return { ...s, duration, beats, ...(typeof s.duration === "number" ? {} : { span: s.duration }) };
  });
  return { ...sb, scenes };
}

/**
 * Validate and return either the storyboard (durations and beats in seconds) or readable issues.
 * `grid` is the analysed music, needed when scenes are timed in beats.
 */
export function parseStoryboard(raw: unknown, opts: { grid?: MusicGrid } = {}): { ok: true; value: Storyboard } | { ok: false; issues: string[] } {
  const parsed = StoryboardSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  const issues: string[] = [];
  const r = { data: resolveTiming(parsed.data, opts.grid, issues) };
  const ids = new Set<string>();
  r.data.scenes.forEach((s, i) => {
    if (ids.has(s.id)) issues.push(`scenes.${i}.id: duplicate scene id "${s.id}"`);
    ids.add(s.id);
    for (const b of s.beats) {
      if (b.at > s.duration) issues.push(`scenes.${i}.beats: beat "${b.id}" at ${b.at}s is after the scene ends (${s.duration}s)`);
    }
    const isLast = i === r.data.scenes.length - 1;
    if (s.transition && !isLast) {
      const next = r.data.scenes[i + 1];
      if (s.transition.duration >= Math.min(s.duration, next.duration))
        issues.push(`scenes.${i}.transition: ${s.transition.duration}s is longer than one of the scenes it joins`);
    }
    // A scene's incoming and outgoing transitions both drive its root: they must not overlap.
    const prev = i > 0 ? r.data.scenes[i - 1].transition : undefined;
    const inD = prev && prev.type !== "cut" ? prev.duration : 0;
    const outD = s.transition && s.transition.type !== "cut" && !isLast ? s.transition.duration : 0;
    if (inD && outD && inD + outD > s.duration)
      issues.push(`scenes.${i}: its incoming (${inD}s) and outgoing (${outD}s) transitions overlap inside its ${s.duration}s — lengthen the scene or shorten a transition`);
  });
  return issues.length ? { ok: false, issues } : { ok: true, value: r.data };
}
