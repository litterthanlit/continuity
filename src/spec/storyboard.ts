import { z } from "zod";
import { eases } from "../motion/tokens.js";
import { DIRS, TRANSITION_COLORS, TRANSITION_DEFS, TRANSITIONS, type TransitionParam } from "../motion/transitions.js";
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

export const BeatSchema = z.object({
  id: z.string().regex(/^[a-z][\w-]*$/i, "beat ids are short words like b1, land, cta"),
  at: z.number().min(0),
  note: z.string().optional(),
});

const PARAMS: readonly TransitionParam[] = ["ease", "dir", "angle", "feather", "origin", "n", "stagger", "blur", "color", "flash"];

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
    origin: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
    n: z.number().int().min(2).max(12).optional(),
    stagger: z.number().min(0).max(0.1).optional(),
    blur: z.union([z.boolean(), z.number().min(0).max(200)]).optional(),
    color: z.enum(TRANSITION_COLORS).optional(),
    flash: z.number().min(0).max(0.5).optional(),
  })
  .superRefine((t, ctx) => {
    const def = TRANSITION_DEFS[t.type];
    for (const p of PARAMS) {
      if (t[p] !== undefined && !def.params.includes(p)) {
        ctx.addIssue({ code: "custom", path: [p], message: `${t.type} has no "${p}" parameter (it takes: ${def.params.join(", ") || "none"})` });
      }
    }
    if (t.dir && def.dirs && !def.dirs.includes(t.dir)) {
      ctx.addIssue({ code: "custom", path: ["dir"], message: `${t.type} runs ${def.dirs.join(" or ")}, not ${t.dir}` });
    }
  })
  .transform((t) => ({ ...t, duration: t.duration ?? TRANSITION_DEFS[t.type].duration }));

export const ElementSchema = z.object({
  id: z.string().regex(/^[a-z][\w-]*$/i),
  role: z
    .enum(["headline", "subhead", "eyebrow", "body", "label", "caption", "cta", "stat", "logo", "ui", "decor", "media"])
    .optional(),
  /** Coarse placement on a 6×6 grid, columns A–F, rows 1–6 (e.g. "B2", "C3:D4"). */
  anchor: z.string().regex(/^[A-F][1-6](:[A-F][1-6])?$/).optional(),
  note: z.string().optional(),
});

export const SceneSchema = z.object({
  id,
  /** Seconds, including any transition overlap into the next scene. */
  duration: z.number().positive().max(60),
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
  theme: z.string().default("mono-dark"),
  /** Type kit (font pairing): swiss, atelier, wonk, terminal, broadside, flexion. Omit for the theme's classic fonts. */
  type: z.enum(KIT_NAMES).optional(),
  /** Optional musical grid for cutting on the beat (seam for audio). */
  bpm: z.number().positive().optional(),
  scenes: z.array(SceneSchema).min(1),
});

export type Storyboard = z.infer<typeof StoryboardSchema>;
export type SceneSpec = z.infer<typeof SceneSchema>;
export type BeatSpec = z.infer<typeof BeatSchema>;

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

/** Validate and return either the storyboard or readable issues. */
export function parseStoryboard(raw: unknown): { ok: true; value: Storyboard } | { ok: false; issues: string[] } {
  const r = StoryboardSchema.safeParse(raw);
  if (!r.success) {
    return {
      ok: false,
      issues: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  const issues: string[] = [];
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
