/**
 * A WebGL shot as data (docs/decisions/0009). The `<Gl>` kit component writes it onto a canvas at
 * build time; the GL runtime (three.js, bundled only into compositions that use it) mounts it.
 * Motion is not here: objects and the camera are timeline targets like any element, so their
 * tweens are linted, stripped and seeked exactly like DOM motion, and every frame is a pure
 * function of t.
 *
 * Units are the frame's: x, y and z in px at the z = 0 plane (y down, as in CSS), angles in deg.
 * Materials are static presets — litt's material never animates; light comes from above.
 */
/**
 * Chrome keeps at most this many live WebGL contexts per page and silently drops the oldest past
 * it. GL shots (0009) and gradient fields (0011) each hold one, so a composition with more is an
 * error: the evicted canvas would render blank, and three.js does not notice.
 */
export const MAX_WEBGL_CONTEXTS = 16;

/** The error for a composition over the context cap, shared by the build and the runtime. */
export function webglContextsMessage(shots: number, fields: number): string {
  return (
    shots + fields + " WebGL canvases (" + shots + " GL shots, " + fields + " gradient fields): Chrome keeps " +
    MAX_WEBGL_CONTEXTS + " per page and drops the oldest silently, so a shot or a field would render blank. " +
    'Use bg="solid" on some scenes or fewer <Gl> shots (docs/decisions/0011)'
  );
}

export const GL_MATERIALS = ["chrome", "glass", "neon", "satin"] as const;
export type GlMaterialName = (typeof GL_MATERIALS)[number];

/** A colour token (`fg`, `accent`, `canvas`, a data hue such as `data-blue`) or a CSS colour. */
export type GlColor = string;

export interface GlMaterial {
  preset: GlMaterialName;
  /** chrome/satin: tint; neon: the light's colour (default `accent`); glass: tint (default clear). */
  color?: GlColor;
  /** neon: brightness of the tube (HDR, default 3). */
  intensity?: number;
}

export type GlGeometry =
  /** An SVG outline extruded into a solid (a logo). `size`: its width in px; `depth`/`bevel` in px. */
  | { kind: "extrude"; path: string; size: number; depth: number; bevel?: number }
  /** Glowing tubes along an SVG outline's contours (neon). `radius` px. */
  | { kind: "tubes"; path: string; size: number; radius: number }
  /** A flat card behind the subject, for glass to refract: a hairline grid, or a line of type. */
  | { kind: "plane"; width: number; height: number; texture: "grid" | { text: string; size: number; ink?: GlColor } };

export interface GlObject {
  /** Full timeline id `<scene>.<id>`. */
  id: string;
  geometry: GlGeometry;
  material: GlMaterial;
  /** Settled placement; tweens move it from here. */
  x?: number;
  y?: number;
  z?: number;
  rotateX?: number;
  rotateY?: number;
  rotate?: number;
  scale?: number;
}

/**
 * Post on a GL shot. Chromatic aberration, glitch, displacement and depth of field need the whole
 * frame as a texture (a full-resolution pass, ~150 ms in software GL) and are not here yet.
 */
export interface GlPost {
  /** Bloom: light that spills. strength 0..2, threshold (linear, brightest channel) 0..4, radius 0..1. */
  bloom?: { strength: number; threshold: number; radius: number };
  /** Static film grain 0..0.1 (never animated: material is static). */
  grain?: number;
  /** Edge darkening 0..1. */
  vignette?: number;
}

export interface GlSpec {
  version: 1;
  /** The canvas's own timeline id; the camera is `<id>-camera`. */
  id: string;
  width: number;
  height: number;
  /** Vertical field of view, deg. The camera sits where the z = 0 plane is 1px per unit. */
  fov: number;
  /** `canvas` (the theme's background), or `transparent` to sit over the DOM. */
  background: "canvas" | "transparent";
  /** Procedural studio: litt's light from above, a softbox overhead and two strip lights. */
  environment: "studio";
  exposure: number;
  objects: GlObject[];
  post?: GlPost;
}

export const cameraId = (spec: Pick<GlSpec, "id">) => `${spec.id}-camera`;

/** Distance from the camera to the z = 0 plane that makes one unit one pixel. */
export function cameraDistance(height: number, fov: number): number {
  return height / 2 / Math.tan((fov * Math.PI) / 360);
}
