/**
 * Gradient fields (docs/decisions/0011): each `canvas[data-ct-gradient]` that `<Stage bg="gradient">`
 * writes gets its own WebGL2 context and program, and is drawn as a pure function of global time,
 * so two scenes on the same preset show the same field at the same instant and it flows through a
 * cut. Half the composition's resolution: the field is soft, and SwiftShader pays per pixel.
 */
import type { GradientUniforms } from "../themes/gradients.js";
import { MAX_WEBGL_CONTEXTS, webglContextsMessage } from "../gl/spec.js";
import type { Timeline } from "../motion/types.js";
import { FIELD_FRAG, FIELD_VERT } from "./gradient-shader.js";

interface Field {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  uT: WebGLUniformLocation | null;
  speed: number;
  /** The global time last drawn: the canvas keeps those pixels (preserveDrawingBuffer). */
  last: number;
}

const fields = new Map<string, Field[]>();

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type) as WebGLShader;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("gradient shader: " + gl.getShaderInfoLog(s));
  return s;
}

/**
 * `bleed`: the share of the frame the backdrop extends past the scene root on each side (a carried
 * scene, SceneTimeline.bleed). The canvas grows with it and the field is laid out on the frame, so
 * the frame shows the same field either way and the bleed is more of it.
 */
function mount(canvas: HTMLCanvasElement, width: number, height: number, bleed = { x: 0, y: 0 }): Field {
  canvas.width = Math.round((width * (1 + 2 * bleed.x)) / 2);
  canvas.height = Math.round((height * (1 + 2 * bleed.y)) / 2);
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error("WebGL2 is unavailable: a gradient backdrop cannot render (docs/decisions/0011)");
  const prog = gl.createProgram() as WebGLProgram;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, FIELD_VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FIELD_FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("gradient program: " + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const u = JSON.parse(canvas.getAttribute("data-ct-gradient") as string) as GradientUniforms;
  gl.uniform2f(gl.getUniformLocation(prog, "u_res"), canvas.width, canvas.height);
  gl.uniform1f(gl.getUniformLocation(prog, "u_frame"), height / 2);
  gl.uniform1f(gl.getUniformLocation(prog, "u_seed"), u.seed);
  gl.uniform3fv(gl.getUniformLocation(prog, "u_colors"), u.colors);
  gl.uniform3fv(gl.getUniformLocation(prog, "u_base"), u.base);
  gl.uniform1f(gl.getUniformLocation(prog, "u_scale"), u.scale);
  gl.uniform1f(gl.getUniformLocation(prog, "u_warp"), u.warp);
  gl.viewport(0, 0, canvas.width, canvas.height);
  return { canvas, gl, uT: gl.getUniformLocation(prog, "u_t"), speed: u.speed, last: NaN };
}

/**
 * Before any context exists: past Chrome's per-page cap the oldest contexts (the GL shots, mounted
 * first) are dropped without an error, and three.js keeps drawing into them as a no-op. Stop instead.
 */
export function checkWebglContexts(): void {
  const shots = document.querySelectorAll("canvas[data-ct-gl]").length;
  const fields = document.querySelectorAll("canvas[data-ct-gradient]").length;
  if (shots + fields > MAX_WEBGL_CONTEXTS) throw new Error(webglContextsMessage(shots, fields));
}

/** Mount every gradient canvas in the composition (once, at prepare). */
export function mountGradients(): void {
  const { width, height, scenes } = (window.__CT__ as { timeline: Timeline }).timeline;
  document.querySelectorAll<HTMLCanvasElement>("canvas[data-ct-gradient]").forEach((canvas) => {
    const scene = canvas.closest("[data-ct-scene]")?.getAttribute("data-ct-scene");
    if (!scene) throw new Error("a gradient canvas outside any scene");
    // Only the Stage's own backdrop bleeds (the build's CSS); a field drawn elsewhere keeps its box.
    const backdrop = canvas.closest(".ct-stage > .ct-backdrop");
    const bleed = backdrop ? scenes.find((s) => s.scene === scene)?.bleed : undefined;
    fields.set(scene, [...(fields.get(scene) ?? []), mount(canvas, width, height, bleed)]);
  });
}

/** Draw `scene`'s fields at global time `globalT` (seconds); a canvas already showing that time is left as is. */
export function drawGradients(scene: string, globalT: number): void {
  const list = fields.get(scene);
  if (!list) return;
  for (const f of list) {
    if (f.last === globalT || !f.canvas.isConnected) continue;
    // A lost context would render the rest of the film over a blank backdrop: stop instead.
    if (f.gl.isContextLost()) throw new Error("the WebGL context of scene " + scene + "'s gradient field was lost");
    f.gl.uniform1f(f.uT, globalT * f.speed);
    f.gl.drawArrays(f.gl.TRIANGLES, 0, 3);
    f.last = globalT;
  }
}
