import * as THREE from "three";

/**
 * litt's light, as an environment for reflections: a warm, dark room lit from above. A softbox
 * overhead (the light source); behind the camera a tall card that is bright at the top and cut
 * off by a crisp horizon, so a face turned to us reflects light-over-dark — chrome's signature —
 * and the line sweeps across it as the mark turns; two strips at the sides to draw the edges; a
 * faint bounce from below. Built from geometry and prefiltered once (PMREM): deterministic, no
 * image files, nothing animates.
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(50, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "varying vec3 vDir; void main() {" +
        "  float y = vDir.y;" +
        "  vec3 floorC = vec3(0.012, 0.010, 0.009);" +
        "  vec3 horizon = vec3(0.05, 0.045, 0.04);" +
        "  vec3 sky = vec3(0.16, 0.15, 0.14);" +
        "  vec3 c = y < 0.0 ? mix(horizon, floorC, smoothstep(0.0, -0.6, y)) : mix(horizon, sky, smoothstep(0.0, 0.9, y));" +
        "  gl_FragColor = vec4(c, 1.0);" +
        "}",
    }),
  );
  scene.add(dome);
  const panel = (w: number, h: number, intensity: number, pos: [number, number, number], look: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity * 0.97, intensity * 0.93), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(...look);
    scene.add(m);
  };
  panel(36, 14, 6, [0, 24, 2], [0, 0, 0]); // the light from above
  panel(44, 16, 2.6, [0, 10, 30], [0, 10, 0]); // behind the camera: light over the horizon…
  panel(44, 3, 0.9, [0, 1.2, 30], [0, 1.2, 0]); // …fading into it
  panel(2.6, 30, 4.5, [-22, 4, 12], [0, 0, 0]); // strip, left
  panel(2.6, 30, 3.4, [22, 4, 12], [0, 0, 0]); // strip, right
  panel(30, 6, 0.25, [0, -20, 14], [0, 0, 0]); // bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  });
  return tex;
}
