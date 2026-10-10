import type { Aspect } from "../spec/storyboard.js";
import type { Theme } from "../themes/index.js";
import type { TypeKit } from "../themes/kits.js";

export interface SceneContext {
  /** Scene id (from the storyboard). */
  id: string;
  /** On-screen copy for this scene, keyed by element id (storyboard `text`). */
  text: Record<string, string>;
  aspect: Aspect;
  width: number;
  height: number;
  portrait: boolean;
  landscape: boolean;
  square: boolean;
  theme: Theme;
  /** The scene's type kit (the video's, or the scene's own `type`). */
  typeKit: TypeKit;
  beats: Record<string, number>;
  duration: number;
  /** Position of this scene in the video. */
  index: number;
  total: number;
}

let current: SceneContext | null = null;
const missingText = new Set<string>();

/** Run `fn` (typically a static render) with `ctx` as the active scene. */
export function withScene<T>(ctx: SceneContext, fn: () => T): T {
  const prev = current;
  current = ctx;
  try {
    return fn();
  } finally {
    current = prev;
  }
}

export function useScene(): SceneContext {
  if (!current) throw new Error("Kit components must render inside a scene (the builder sets this up).");
  return current;
}

/** Full `data-ct` id for an element of the current scene. */
export function ctId(local: string): string {
  if (local.includes(".")) return local;
  return `${useScene().id}.${local}`;
}

/**
 * Wrap storyboard copy so reading a key that doesn't exist is recorded (and
 * reported as a build warning) instead of silently rendering "undefined".
 */
export function textProxy(sceneId: string, text: Record<string, string>): Record<string, string> {
  return new Proxy(text, {
    get(target, key) {
      if (typeof key !== "string") return undefined;
      if (key in target) return target[key];
      missingText.add(`${sceneId}.${key}`);
      return `⟨${key}⟩`;
    },
  });
}

export function drainMissingText(): string[] {
  const out = [...missingText];
  missingText.clear();
  return out;
}
