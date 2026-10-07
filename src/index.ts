/**
 * Continuity — public authoring API for scene files.
 *
 *   import { scene, Stage, Center, Headline } from "continuity";
 *
 *   export default scene({
 *     view: ({ text }) => (
 *       <Stage>
 *         <Center><Headline ct="title">{text.title}</Headline></Center>
 *       </Stage>
 *     ),
 *     motion: (m) => {
 *       m.enter("title", "maskUp", { at: "b1", split: "lines" });
 *     },
 *   });
 */
import type { VNode } from "preact";
import type { SceneContext } from "./kit/context.js";
import type { MotionBuilder } from "./motion/dsl.js";

export interface SceneDefinition {
  /** Static layout: rendered once to HTML at build time. Use kit components + Tailwind classes. */
  view: (ctx: SceneContext) => VNode;
  /** Motion as data: declare tweens with presets/tokens on `ct` element ids. */
  motion?: (m: MotionBuilder, ctx: SceneContext) => void;
}

export function scene(def: SceneDefinition): SceneDefinition {
  return def;
}

export type { SceneContext } from "./kit/context.js";
export { useScene, ctId } from "./kit/context.js";
export * from "./kit/core.js";
export * from "./kit/type.js";
export type { MotionBuilder, At, PresetCallOptions, TweenCallOptions } from "./motion/dsl.js";
export { durations, eases, staggers, readTime } from "./motion/tokens.js";
export type { DurationToken, EaseToken, StaggerToken } from "./motion/tokens.js";
export { defineTheme, themes } from "./themes/index.js";
export type { Theme } from "./themes/index.js";
