import storyboard from "../storyboard.json" with { type: "json" };

/**
 * The film's own numbers, read from storyboard.json so the mock UI that shows
 * this film (the storyboard rows, the contact sheet header, the energy chart's
 * time axis) can never drift from the cut. Same rule as the engine: a scene
 * starts where the previous one's transition begins; a cut (no transition, or
 * type "cut") does not overlap.
 */
type Sc = { id: string; duration: number; beats: { at: number }[]; transition?: { type: string; duration?: number } };

export const SCENES = storyboard.scenes as Sc[];

const overlap = (s: Sc, last: boolean) =>
  last || !s.transition || s.transition.type === "cut" ? 0 : (s.transition.duration ?? 0.5);

/** [scene id, global start s] in order. */
export const STARTS: [string, number][] = (() => {
  const out: [string, number][] = [];
  let t = 0;
  SCENES.forEach((s, i) => {
    out.push([s.id, Math.round(t * 1000) / 1000]);
    t += s.duration - overlap(s, i === SCENES.length - 1);
  });
  return out;
})();

/** Running time of the cut, seconds. */
export const FILM_S = STARTS[STARTS.length - 1][1] + SCENES[SCENES.length - 1].duration;
export const FPS = storyboard.format.fps;
export const FILM_FRAMES = Math.round(FILM_S * FPS);
export const FORMAT = `${storyboard.format.aspect} · ${FPS} fps · ${storyboard.theme}`;
export const fmtS = (s: number) => `${(Math.round(s * 10) / 10).toFixed(1)}s`;
