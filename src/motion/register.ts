import { MAX_BOUNCE, MAX_DRIFT, TRAVEL } from "./tokens.js";

/**
 * Registers — how loud litt speaks (docs/decisions/0007).
 *
 * The look stays litt in every register: Geist in three weights, two inks, warm
 * neutrals, material static, colour that behaves like light or carries data.
 * What a register changes is the motion's energy, and the lint's bounds follow
 * it so the skill and the gate never disagree.
 *
 * - `calm` (the default): litt as 0006 wrote it — a launch, a feature, a
 *   statement. Responsive springs, one expressive moment, cuts on the beat.
 * - `energetic`: a brand reel, a montage, a social cut built from collage and
 *   UI. Steep ease-in-outs for interface and camera, overshooting springs for
 *   things that act like objects, linear for machines, a camera that travels
 *   through depth, bursts followed by holds.
 *
 * Set it once on the storyboard (`"register": "energetic"`), or per scene to
 * give a calm video one energetic chapter.
 */
export const REGISTERS = ["calm", "energetic"] as const;
export type Register = (typeof REGISTERS)[number];

export interface RegisterBounds {
  description: string;
  /** Highest spring bounce before `spring-bounce` warns. */
  maxBounce: number;
  /** Bouncing entrances (expressive moments, groups count once) per scene before `expressive-budget` warns. */
  moments: number;
  /** Entrance offset (px) before `travel-too-far` warns. */
  maxTravel: number;
  /** Ambient camera zoom over a scene before `camera-drift` warns. */
  maxDrift: number;
  /** Camera speed before `camera-too-fast` warns: zoom per second, px per second. */
  cameraZoomRate: number;
  cameraPan: number;
  /** Independent movers mid-entrance at once before `crowded` warns. */
  crowded: number;
  /** Accent transition types (besides cuts) before `transition-language` warns. */
  accents: number;
  /** A loop on an object (never the backdrop): a warning, or an info the critic weighs. */
  loops: "warning" | "info";
  /** Linear rotation is a machine (a spinning ring), not a mechanical-looking move. */
  linearRotation: boolean;
  /** Copy never just fades: it types on or wipes on (`text-fade`). */
  textTypesOrWipes: boolean;
}

export const REGISTER_BOUNDS: Record<Register, RegisterBounds> = {
  calm: {
    description: "litt as written: responsive springs, one expressive moment per scene, cuts on the beat, the camera's slow push.",
    maxBounce: MAX_BOUNCE,
    moments: 1,
    maxTravel: TRAVEL * 2,
    maxDrift: MAX_DRIFT,
    cameraZoomRate: 0.15,
    cameraPan: 160,
    crowded: 5,
    accents: 2,
    loops: "warning",
    linearRotation: false,
    textTypesOrWipes: false,
  },
  energetic: {
    description: "A brand reel or montage: steep in-outs for UI and camera, pop springs for objects, linear for machines, depth moves, bursts then holds.",
    maxBounce: 0.35,
    moments: 3,
    maxTravel: TRAVEL * 5,
    maxDrift: 0.08,
    cameraZoomRate: 0.5,
    cameraPan: 480,
    crowded: 7,
    accents: 3,
    loops: "info",
    linearRotation: true,
    textTypesOrWipes: true,
  },
};

/** The register a scene runs in: its own, else the storyboard's, else calm. */
export function registerOf(sb: { register?: Register; scenes: Array<{ id: string; register?: Register }> } | undefined, scene?: string): Register {
  const own = scene ? sb?.scenes.find((s) => s.id === scene)?.register : undefined;
  return own ?? sb?.register ?? "calm";
}
