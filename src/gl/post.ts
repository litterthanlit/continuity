import * as THREE from "three";
import type { GlPost } from "./spec.js";

/**
 * The post chain, sized for software GL (docs/decisions/0009). Measured in SwiftShader at 1080p,
 * a full-resolution HalfFloat target written by the scene and read back by a composite cost
 * ~155 ms a frame on its own; MSAA on it doubled that; half-float pyramid targets cost ~40 ms more
 * than 8-bit ones. So the scene draws straight onto the canvas (MSAA, three's tone mapping), and
 * the light that spills is computed small: the scene re-drawn into a quarter-size HDR target (1/16
 * of the pixels), thresholded into 8-bit (stored at 1/4 so light up to 4× white survives), blurred
 * at 1/4, 1/8 and 1/16, then laid over the canvas in one blended pass that also carries the
 * vignette and a static grain. Grain is hashed from the pixel, never from time: material static.
 */
const VERT = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

const BRIGHT =
  "uniform sampler2D src; uniform float threshold; varying vec2 vUv;" +
  "void main() {" +
  "  vec3 c = texture2D(src, vUv).rgb;" +
  "  float l = max(c.r, max(c.g, c.b));" + // a saturated light is bright in one channel, not in luminance
  "  gl_FragColor = vec4(c * (max(l - threshold, 0.0) / max(l, 1e-4)) * 0.25, 1.0);" +
  "}";

// 9-tap Gaussian folded into 5 bilinear taps.
const BLUR =
  "uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;" +
  "void main() {" +
  "  vec3 c = texture2D(src, vUv).rgb * 0.2270270270;" +
  "  c += texture2D(src, vUv + dir * 1.3846153846).rgb * 0.3162162162;" +
  "  c += texture2D(src, vUv - dir * 1.3846153846).rgb * 0.3162162162;" +
  "  c += texture2D(src, vUv + dir * 3.2307692308).rgb * 0.0702702703;" +
  "  c += texture2D(src, vUv - dir * 3.2307692308).rgb * 0.0702702703;" +
  "  gl_FragColor = vec4(c, 1.0);" +
  "}";

const DOWN = "uniform sampler2D src; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(src, vUv).rgb, 1.0); }";

// Blended over the canvas with (ONE, SRC_ALPHA): rgb adds (bloom, grain), alpha scales what is there (vignette).
const OVERLAY =
  "uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D b3; uniform float strength; uniform float radius; uniform float grain; uniform float vignette; uniform vec2 res;" +
  "varying vec2 vUv;" +
  "float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }" +
  "void main() {" +
  "  vec3 bloom = (texture2D(b1, vUv).rgb * (1.0 - radius) + texture2D(b2, vUv).rgb + texture2D(b3, vUv).rgb * (0.5 + radius)) * strength * 4.0;" +
  "  vec3 glow = 1.0 - exp(-bloom);" +
  "  vec2 d = (vUv - 0.5) * vec2(res.x / res.y, 1.0);" +
  "  float keep = 1.0 - vignette * smoothstep(0.35, 1.0, length(d));" +
  "  gl_FragColor = vec4(glow + (hash(gl_FragCoord.xy) - 0.5) * grain, keep);" +
  "}";

export class Post {
  private small: THREE.WebGLRenderTarget;
  private levels: Array<{ a: THREE.WebGLRenderTarget; b: THREE.WebGLRenderTarget }>;
  private quad: THREE.Mesh;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private bright: THREE.ShaderMaterial;
  private blur: THREE.ShaderMaterial;
  private down: THREE.ShaderMaterial;
  private overlay: THREE.ShaderMaterial;

  constructor(
    private renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    private post: GlPost,
  ) {
    const rt = (f: number, hdr: boolean) =>
      new THREE.WebGLRenderTarget(Math.max(1, Math.round(width / f)), Math.max(1, Math.round(height / f)), { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: hdr, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter });
    this.small = rt(4, true);
    this.levels = [4, 8, 16].map((f) => ({ a: rt(f, false), b: rt(f, false) }));
    const mat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    this.bright = mat(BRIGHT, { src: { value: this.small.texture }, threshold: { value: post.bloom?.threshold ?? 1 } });
    this.blur = mat(BLUR, { src: { value: null }, dir: { value: new THREE.Vector2() } });
    this.down = mat(DOWN, { src: { value: null } });
    this.overlay = mat(OVERLAY, {
      b1: { value: this.levels[0].a.texture },
      b2: { value: this.levels[1].a.texture },
      b3: { value: this.levels[2].a.texture },
      strength: { value: post.bloom?.strength ?? 0 },
      radius: { value: post.bloom?.radius ?? 0.5 },
      grain: { value: post.grain ?? 0 },
      vignette: { value: post.vignette ?? 0 },
      res: { value: new THREE.Vector2(width, height) },
    });
    Object.assign(this.overlay, { transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.SrcAlphaFactor });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.overlay);
    this.quad.frustumCulled = false;
  }

  private pass(material: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.renderer.setRenderTarget(to);
    this.renderer.render(this.quad, this.cam);
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    const r = this.renderer;
    r.setRenderTarget(null);
    r.render(scene, camera);
    const bloom = this.post.bloom && this.post.bloom.strength > 0;
    if (bloom) {
      // Render targets take no tone mapping: this is the scene's linear light, a quarter the size.
      r.setRenderTarget(this.small);
      r.render(scene, camera);
      this.levels.forEach((l, i) => {
        if (i === 0) this.pass(this.bright, l.a);
        else {
          this.down.uniforms.src.value = this.levels[i - 1].a.texture;
          this.pass(this.down, l.a);
        }
        this.blur.uniforms.src.value = l.a.texture;
        this.blur.uniforms.dir.value.set(1 / l.a.width, 0);
        this.pass(this.blur, l.b);
        this.blur.uniforms.src.value = l.b.texture;
        this.blur.uniforms.dir.value.set(0, 1 / l.b.height);
        this.pass(this.blur, l.a);
      });
    }
    if (bloom || this.post.grain || this.post.vignette) {
      const clear = r.autoClear;
      r.autoClear = false;
      this.pass(this.overlay, null);
      r.autoClear = clear;
    }
  }
}
