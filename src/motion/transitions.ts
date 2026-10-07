import { eases } from "./tokens.js";
import type { EaseSpec, PropName, PropRange, Tween } from "./types.js";

export const TRANSITIONS = ["cut", "crossfade", "dip", "push", "pushUp", "blur", "zoom", "wipe"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

export const transitionDescriptions: Record<TransitionType, string> = {
  cut: "Hard cut. The default between punchy kinetic-type beats; cut on the beat.",
  crossfade: "Incoming scene fades over the outgoing one. Calm, continuous.",
  dip: "Out fades to the background colour, then in fades up. A breath between chapters.",
  push: "Incoming pushes the outgoing scene off to the left. Sequential steps, carousels.",
  pushUp: "Incoming pushes up from below. Vertical feeds, lists, 9:16.",
  blur: "Defocus out, focus in. Premium, dreamy.",
  zoom: "Zoom-through: out scales up and fades, in settles from smaller. Energy, momentum.",
  wipe: "Incoming scene wipes on left → right with a clip-path edge.",
};

type Props = Partial<Record<PropName, PropRange>>;

function tw(target: string, start: number, duration: number, props: Props, ease: EaseSpec, easeName: string): Tween {
  return { target, kind: "transition", start, duration, ease, easeName, props };
}

/**
 * Tweens on the two scene root elements (`<scene>.scene`) that realise a
 * transition. Outgoing tweens use the outgoing scene's local clock (they end at
 * its last frame); incoming tweens start at the incoming scene's t=0.
 */
export function transitionTweens(
  type: TransitionType,
  duration: number,
  out: { id: string; duration: number },
  into: { id: string },
): { out: Tween[]; in: Tween[] } {
  const o = `${out.id}.scene`;
  const i = `${into.id}.scene`;
  const os = Math.max(0, out.duration - duration);
  const io = eases.inOut;
  switch (type) {
    case "cut":
      return { out: [], in: [] };
    case "crossfade":
      return { out: [], in: [tw(i, 0, duration, { opacity: [0, 1] }, eases.standard, "standard")] };
    case "dip":
      return {
        out: [tw(o, os, duration / 2, { opacity: [null, 0] }, eases.exit, "exit")],
        in: [tw(i, duration / 2, duration / 2, { opacity: [0, 1] }, eases.enter, "enter")],
      };
    case "push":
      return {
        out: [tw(o, os, duration, { xPct: [0, -100] }, io, "inOut")],
        in: [tw(i, 0, duration, { xPct: [100, 0] }, io, "inOut")],
      };
    case "pushUp":
      return {
        out: [tw(o, os, duration, { yPct: [0, -100] }, io, "inOut")],
        in: [tw(i, 0, duration, { yPct: [100, 0] }, io, "inOut")],
      };
    case "blur":
      return {
        out: [tw(o, os, duration, { blur: [null, 24] }, io, "inOut")],
        in: [tw(i, 0, duration, { opacity: [0, 1], blur: [24, 0] }, io, "inOut")],
      };
    case "zoom":
      // Both scenes move toward the camera; the incoming one never scales below 1,
      // so its edges are never revealed.
      return {
        out: [tw(o, os, duration, { scale: [null, 1.3], opacity: [null, 0], blur: [null, 10] }, eases.exit, "exit")],
        in: [tw(i, 0, duration, { scale: [1.12, 1], opacity: [0, 1], blur: [12, 0] }, eases.hero, "hero")],
      };
    case "wipe":
      return { out: [], in: [tw(i, 0, duration, { clipRight: [100, 0] }, io, "inOut")] };
  }
}
