/**
 * Continuity GL runtime (docs/decisions/0009): mounts `<Gl>` shots with three.js. Bundled into
 * `continuity-gl.js` only for compositions that have a GL canvas; the motion runtime calls
 * `window.__ctGl.mount` at prepare time and `set`/`render` from its frame source, so a GL frame
 * is a pure function of the timeline's values at t — no clock, no randomness, no feedback
 * between frames. Rendered in software (SwiftShader) it is byte-identical across workers.
 */
import * as THREE from "three";
import { studioEnvironment } from "./environment.js";
import { extrude, planeTexture, tubes } from "./geometry.js";
import { glassMaterial, type Backdrop } from "./glass.js";
import { Post } from "./post.js";
import { cameraDistance, cameraId, type GlMaterial, type GlObject, type GlSpec } from "./spec.js";

type Values = Partial<Record<"x" | "y" | "z" | "rotateX" | "rotateY" | "rotate" | "scale", number>>;

export interface GlHandle {
  /** Timeline ids this shot answers to: its objects and its camera. */
  ids: string[];
  set(id: string, v: Values): void;
  render(): void;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * A litt token (`accent`, `data-blue`, `fg`…) or any CSS colour, resolved through the page's CSS.
 * Tokens win: `canvas` and `accent` are also CSS system colours (Canvas, AccentColor).
 */
function resolveColor(el: Element, c: string): THREE.Color {
  const token = /^[a-z][a-z0-9-]*$/.test(c) ? getComputedStyle(el).getPropertyValue("--color-" + c).trim() : "";
  const css = token || c;
  const probe = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;
  probe.fillStyle = "#000";
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

function cssColor(el: Element, c: string): string {
  const v = resolveColor(el, c).clone().convertLinearToSRGB();
  return "rgb(" + Math.round(v.r * 255) + "," + Math.round(v.g * 255) + "," + Math.round(v.b * 255) + ")";
}

function material(canvas: HTMLCanvasElement, m: GlMaterial, geometry: GlObject["geometry"], backdrop: Backdrop | undefined): THREE.Material {
  const color = (fallback: string) => resolveColor(canvas, m.color ?? fallback);
  switch (m.preset) {
    case "chrome":
      return new THREE.MeshPhysicalMaterial({ color: color("fg"), metalness: 1, roughness: 0.08, clearcoat: 0.6, clearcoatRoughness: 0.04, envMapIntensity: 1.15 });
    case "satin":
      return new THREE.MeshPhysicalMaterial({ color: color("surface-1"), metalness: 0.2, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.2 });
    case "glass": {
      const depth = geometry.kind === "extrude" ? geometry.depth : 40;
      const tint = m.color ? color(m.color) : new THREE.Color(1, 1, 1);
      if (backdrop) return glassMaterial({ tint, thickness: depth * 0.6, backdrop, background: resolveColor(canvas, "canvas"), dispersion: 0.03 });
      // No card to refract: three's transmission (renders the scene behind the glass — slow in software).
      return new THREE.MeshPhysicalMaterial({
        color: m.color ? color(m.color) : new THREE.Color(1, 1, 1),
        metalness: 0,
        roughness: 0.03,
        transmission: 1,
        thickness: depth * 0.9,
        ior: 1.5,
        dispersion: 0.6,
        specularIntensity: 1,
        envMapIntensity: 1.3,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
      });
    }
    case "neon": {
      const c = color("accent").multiplyScalar(m.intensity ?? 3);
      return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    }
  }
}

export function mount(canvas: HTMLCanvasElement, spec: GlSpec): GlHandle {
  const { width: W, height: H } = spec;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: spec.background === "transparent", preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.transmissionResolutionScale = 0.5;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = spec.exposure;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  if (spec.background === "canvas") scene.background = resolveColor(canvas, "canvas");

  const D = cameraDistance(H, spec.fov);
  const camera = new THREE.PerspectiveCamera(spec.fov, W / H, Math.max(1, D / 100), D * 20);
  const cam = { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, rotate: 0, scale: 1 };

  const family = getComputedStyle(canvas).getPropertyValue("--font-display").trim() || "sans-serif";
  const objects = new Map<string, { node: THREE.Object3D; base: Required<Values> }>();
  let backdrop: Backdrop | undefined;
  // Cards first, so glass knows what it refracts.
  const ordered = [...spec.objects.filter((o) => o.geometry.kind === "plane"), ...spec.objects.filter((o) => o.geometry.kind !== "plane")];
  for (const o of ordered) {
    const g = o.geometry;
    let mesh: THREE.Mesh;
    if (g.kind === "extrude") mesh = new THREE.Mesh(extrude(g.path, g.size, g.depth, g.bevel), material(canvas, o.material, g, backdrop));
    else if (g.kind === "tubes") mesh = new THREE.Mesh(tubes(g.path, g.size, g.radius), material(canvas, o.material, g, backdrop));
    else {
      const ink = g.texture !== "grid" && g.texture.ink ? g.texture.ink : "fg-muted";
      const tex = planeTexture(g.texture, g.width, g.height, cssColor(canvas, ink), cssColor(canvas, "canvas"), family);
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(g.width, g.height), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      backdrop ??= { mesh, texture: tex, width: g.width, height: g.height };
    }
    const base = { x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0, rotateX: o.rotateX ?? 0, rotateY: o.rotateY ?? 0, rotate: o.rotate ?? 0, scale: o.scale ?? 1 };
    scene.add(mesh);
    objects.set(o.id, { node: mesh, base });
  }

  const post = spec.post ? new Post(renderer, W, H, spec.post) : undefined;
  const state = new Map<string, Values>();
  let dirty = true;

  const place = () => {
    for (const [id, { node, base }] of objects) {
      const v = { ...base, ...state.get(id) };
      node.position.set(v.x, -v.y, v.z);
      node.rotation.set(rad(v.rotateX), rad(v.rotateY), -rad(v.rotate));
      node.scale.setScalar(v.scale);
    }
    const c = { ...cam, ...state.get(cameraId(spec)) };
    // Orbit the target (the frame's centre, moved by x/y), dolly in by z, zoom by scale.
    const target = new THREE.Vector3(c.x, -c.y, 0);
    const r = D - c.z;
    camera.position.set(
      target.x + r * Math.sin(rad(c.rotateY)) * Math.cos(rad(c.rotateX)),
      target.y + r * Math.sin(rad(c.rotateX)),
      r * Math.cos(rad(c.rotateY)) * Math.cos(rad(c.rotateX)),
    );
    camera.up.set(Math.sin(rad(c.rotate)), Math.cos(rad(c.rotate)), 0);
    camera.lookAt(target);
    camera.zoom = c.scale;
    camera.updateProjectionMatrix();
  };

  const handle: GlHandle = {
    ids: [...objects.keys(), cameraId(spec)],
    set(id, v) {
      const prev = state.get(id);
      for (const k of Object.keys(v) as Array<keyof Values>) {
        if (prev?.[k] !== v[k]) {
          dirty = true;
          break;
        }
      }
      state.set(id, { ...prev, ...v });
    },
    render() {
      // Same values, same pixels: the canvas keeps the last frame (preserveDrawingBuffer).
      if (!dirty) return;
      dirty = false;
      place();
      if (post) post.render(scene, camera);
      else {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }
    },
  };
  handle.render(); // compiles every shader before the first captured frame
  return handle;
}

declare global {
  interface Window {
    __ctGl?: { mount: typeof mount };
  }
}

window.__ctGl = { mount };
