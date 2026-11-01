/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type { GlObject, GlPost, GlSpec } from "../gl/spec.js";
import { ctId, useScene } from "./context.js";
import { cx } from "./core.js";

export interface GlProps {
  /** The canvas's id; its camera is `<ct>-camera` (x/y truck, z dolly, rotateX/rotateY orbit, scale zoom). */
  ct: string;
  /** Objects, each a timeline target by its own `ct` (x, y, z, rotateX, rotateY, rotate, scale). */
  objects: Array<Omit<GlObject, "id"> & { ct: string }>;
  /** Vertical field of view, deg (default 30). The z = 0 plane is 1px per unit. */
  fov?: number;
  background?: GlSpec["background"];
  exposure?: number;
  /** Post: bloom, static grain, chromatic aberration, vignette — the light, never animated. */
  post?: GlPost;
  class?: string;
}

/**
 * A WebGL shot (three.js; docs/decisions/0009): extruded logos in chrome, glass or neon under
 * litt's light from above. Full-frame by default. Software GL renders it deterministically, at
 * roughly 50–150 ms a frame at 1080p — use it for the shots that need material, not for UI.
 */
export function Gl({ ct, objects, fov = 30, background = "canvas", exposure = 1, post, class: cls }: GlProps) {
  const { width, height } = useScene();
  const spec: GlSpec = {
    version: 1,
    id: ctId(ct),
    width,
    height,
    fov,
    background,
    environment: "studio",
    exposure,
    objects: objects.map(({ ct: id, ...o }) => ({ ...o, id: ctId(id) })),
    ...(post ? { post } : {}),
  };
  return <canvas data-ct={ctId(ct)} data-ct-gl={JSON.stringify(spec)} width={width} height={height} class={cx("absolute inset-0 block h-full w-full", cls)} data-layout-ignore aria-hidden="true" />;
}
