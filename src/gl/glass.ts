import * as THREE from "three";

/**
 * Refractive glass for software GL (docs/decisions/0009). three's transmission re-renders the
 * scene behind the glass into a mipmapped target every frame — ~400 ms at 1080p in SwiftShader.
 * A shot's glass refracts one thing, the card behind it, so this does the optics analytically
 * instead: the view ray bends into the glass (Snell, per channel for dispersion), crosses a slab of
 * the glass's thickness, leaves parallel to where it came in, and is traced to the card's plane,
 * whose texture it samples. Reflection is three's own (the studio environment, Fresnel-weighted);
 * the light that passes through is added under it. A bevel bends the type hard, a flat face shifts
 * it — the look of a thick acrylic slab, at the cost of three texture reads per pixel.
 */
export interface Backdrop {
  mesh: THREE.Mesh;
  texture: THREE.Texture;
  width: number;
  height: number;
}

export function glassMaterial(opts: { tint: THREE.Color; thickness: number; backdrop: Backdrop; background: THREE.Color; ior?: number; dispersion?: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0, roughness: 0.05, envMapIntensity: 1.25 });
  const centre = new THREE.Vector3();
  const uniforms = {
    ctBackdrop: { value: opts.backdrop.texture },
    ctPlane: { value: new THREE.Vector4() },
    ctIor: { value: opts.ior ?? 1.5 },
    ctDispersion: { value: opts.dispersion ?? 0.04 },
    ctThickness: { value: opts.thickness },
    ctTint: { value: opts.tint },
    ctBackground: { value: opts.background },
  };
  // The card can move: its centre and size are read each frame, before the draw.
  m.onBeforeRender = () => {
    opts.backdrop.mesh.getWorldPosition(centre);
    uniforms.ctPlane.value.set(centre.x, centre.y, centre.z, opts.backdrop.width * opts.backdrop.mesh.scale.x);
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCtWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvCtWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\n" +
          "varying vec3 vCtWorld;\n" +
          "uniform sampler2D ctBackdrop; uniform vec4 ctPlane; uniform float ctIor; uniform float ctDispersion; uniform float ctThickness; uniform vec3 ctTint; uniform vec3 ctBackground;\n" +
          "vec3 ctThrough(vec3 v, vec3 n, float eta, float aspect) {\n" +
          "  vec3 r = refract(v, n, eta);\n" +
          "  if (dot(r, r) < 1e-6) r = reflect(v, n);\n" +
          "  vec3 q = vCtWorld + r * (ctThickness / max(0.2, abs(dot(r, n))));\n" +
          "  float t = (ctPlane.z - q.z) / (abs(v.z) > 1e-4 ? v.z : -1e-4);\n" +
          "  vec3 hit = q + v * max(t, 0.0);\n" +
          "  vec2 uv = vec2((hit.x - ctPlane.x) / ctPlane.w + 0.5, (hit.y - ctPlane.y) / (ctPlane.w / aspect) + 0.5);\n" +
          "  vec3 bg = ctBackground;\n" +
          "  return (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? bg : texture2D(ctBackdrop, uv).rgb;\n" +
          "}\n",
      )
      .replace(
        "#include <opaque_fragment>",
        "{\n" +
          "  vec3 v = normalize(vCtWorld - cameraPosition);\n" +
          "  vec3 n = inverseTransformDirection(normal, viewMatrix);\n" +
          "  if (dot(n, v) > 0.0) n = -n;\n" +
          "  float aspect = " +
          (opts.backdrop.width / opts.backdrop.height).toFixed(6) +
          ";\n" +
          "  vec3 through = vec3(\n" +
          "    ctThrough(v, n, 1.0 / (ctIor - ctDispersion), aspect).r,\n" +
          "    ctThrough(v, n, 1.0 / ctIor, aspect).g,\n" +
          "    ctThrough(v, n, 1.0 / (ctIor + ctDispersion), aspect).b);\n" +
          "  float f0 = pow((ctIor - 1.0) / (ctIor + 1.0), 2.0);\n" +
          "  float fresnel = f0 + (1.0 - f0) * pow(1.0 - clamp(dot(-v, n), 0.0, 1.0), 5.0);\n" +
          "  gl_FragColor = vec4(outgoingLight + through * ctTint * (1.0 - fresnel), 1.0);\n" +
          "}",
      );
  };
  // One program per material instance: the backdrop's aspect is compiled in.
  m.customProgramCacheKey = () => "ct-glass-" + (opts.backdrop.width / opts.backdrop.height).toFixed(6);
  return m;
}
