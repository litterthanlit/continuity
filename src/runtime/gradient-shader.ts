/**
 * The gradient field (docs/decisions/0011): four colours on incommensurate Lissajous paths over a
 * base, the domain warped by two octaves of seeded value noise, mixed in linear RGB and dithered
 * into sRGB. No textures, no clock: a pixel is a function of its position and `u_t` (global
 * seconds × the preset's speed) alone.
 *
 * Plain strings joined with newlines: the runtime bundle lowers template literals, and these must
 * reach the GPU unchanged.
 */

/**
 * A full-screen triangle from gl_VertexID (no buffers, no attributes). The vertex stage also
 * places the four colour centres on incommensurate Lissajous paths: they are the same for every
 * pixel, and per-pixel trig cost SwiftShader about a fifth of the frame.
 */
export const FIELD_VERT = [
  "#version 300 es",
  "uniform float u_t;",
  "uniform float u_seed;",
  "flat out vec2 v_c0;",
  "flat out vec2 v_c1;",
  "flat out vec2 v_c2;",
  "flat out vec2 v_c3;",
  "vec2 centre(vec2 f, float i) {",
  "  return 0.42 * vec2(sin(u_t * f.x + 6.28 * (u_seed + i * 0.25)), cos(u_t * f.y + 3.1 * i));",
  "}",
  "void main() {",
  "  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));",
  "  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);",
  "  const vec2 A = vec2(0.71, 0.53), B = vec2(0.97, 0.61), C = vec2(0.43, 0.89), D = vec2(0.59, 0.37);",
  "  v_c0 = centre(A, 0.0);",
  "  v_c1 = centre(B, 1.0);",
  "  v_c2 = centre(C, 2.0);",
  "  v_c3 = centre(D, 3.0);",
  "}",
].join("\n");

export const FIELD_FRAG = [
  "#version 300 es",
  "precision highp float;",
  "uniform vec2 u_res;",
  // The frame's height in canvas px: the field is laid out on the frame, centred, however far the canvas bleeds past it.
  "uniform float u_frame;",
  "uniform float u_t;",
  "uniform float u_seed;",
  "uniform vec3 u_colors[4];",
  "uniform vec3 u_base;",
  "uniform float u_scale;",
  "uniform float u_warp;",
  "flat in vec2 v_c0;",
  "flat in vec2 v_c1;",
  "flat in vec2 v_c2;",
  "flat in vec2 v_c3;",
  "out vec4 o_color;",
  "",
  // Hash without sine (Dave Hoskins, MIT): stable in float32, no trig precision drift.
  "float hash12(vec2 p) {",
  "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);",
  "  p3 += dot(p3, p3.yzx + 33.33);",
  "  return fract((p3.x + p3.y) * p3.z);",
  "}",
  "",
  // Value noise on the integer lattice, smoothstep-interpolated, in -1..1.
  "float vnoise(vec2 p) {",
  "  vec2 i = floor(p);",
  "  vec2 f = fract(p);",
  "  vec2 u = f * f * (3.0 - 2.0 * f);",
  "  float a = hash12(i);",
  "  float b = hash12(i + vec2(1.0, 0.0));",
  "  float c = hash12(i + vec2(0.0, 1.0));",
  "  float d = hash12(i + vec2(1.0, 1.0));",
  "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;",
  "}",
  "",
  // Two octaves; the second is offset so the lattices do not line up.
  "float fbm(vec2 p) {",
  "  return 0.6667 * vnoise(p * 1.4) + 0.3333 * vnoise(p * 2.9 + vec2(17.3, 9.1));",
  "}",
  "",
  "vec3 linearToSrgb(vec3 c) {",
  "  c = clamp(c, 0.0, 1.0);",
  "  vec3 hi = 1.055 * pow(max(c, vec3(1e-6)), vec3(1.0 / 2.4)) - 0.055;",
  "  return mix(c * 12.92, hi, step(vec3(0.0031308), c));",
  "}",
  "",
  // Interleaved gradient noise (Jimenez 2014): a fixed per-pixel dither, the same every frame.
  "float ign(vec2 xy) {",
  "  return fract(52.9829189 * fract(dot(xy, vec2(0.06711056, 0.00583715))));",
  "}",
  "",
  "void main() {",
  "  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_frame / u_scale;",
  "  vec2 q = p + u_warp * vec2(fbm(p + vec2(u_seed, u_t)), fbm(p + vec2(5.2 - u_seed, -u_t)));",
  // Unrolled: a loop indexing u_colors cost SwiftShader about a third of the frame.
  "  vec2 d0 = q - v_c0, d1 = q - v_c1, d2 = q - v_c2, d3 = q - v_c3;",
  "  vec4 w = exp(-3.0 * vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)));",
  "  vec3 sum = u_base * 0.15 + w.x * u_colors[0] + w.y * u_colors[1] + w.z * u_colors[2] + w.w * u_colors[3];",
  "  float wsum = 0.15 + w.x + w.y + w.z + w.w;",
  "  vec3 col = linearToSrgb(sum / wsum) + (ign(gl_FragCoord.xy) - 0.5) / 255.0;",
  "  o_color = vec4(col, 1.0);",
  "}",
].join("\n");
