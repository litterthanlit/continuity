import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** Curve samples per segment of an outline: smooth bevels without a heavy mesh. */
const DIVISIONS = 24;

/**
 * An SVG path's filled regions (holes resolved) as point loops in frame px: centred on the origin,
 * scaled to `size` px wide, y flipped to three's up. ExtrudeGeometry fixes winding itself.
 */
export function outlineShapes(d: string, size: number): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d.replace(/"/g, "")}"/></svg>`);
  const shapes = data.paths.flatMap((p) => p.toShapes());
  const loops = shapes.map((s) => ({ outer: s.getPoints(DIVISIONS), holes: s.holes.map((h) => h.getPoints(DIVISIONS)) }));
  const box = new THREE.Box2();
  for (const l of loops) for (const p of l.outer) box.expandByPoint(p);
  const c = box.getCenter(new THREE.Vector2());
  const k = size / Math.max(1e-6, box.max.x - box.min.x);
  const map = (pts: THREE.Vector2[]) => pts.map((p) => new THREE.Vector2((p.x - c.x) * k, -(p.y - c.y) * k));
  return loops.map((l) => {
    const s = new THREE.Shape(map(l.outer));
    s.holes = l.holes.map((h) => new THREE.Path(map(h)));
    return s;
  });
}

/** A logo as a solid: extruded `depth` px, its front face on z = 0 moved to the middle, bevelled. */
export function extrude(d: string, size: number, depth: number, bevel = 0): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(outlineShapes(d, size), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 5,
    curveSegments: DIVISIONS,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** Neon: a tube along every contour of the outline (holes too), closed. */
export function tubes(d: string, size: number, radius: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const s of outlineShapes(d, size)) {
    for (const loop of [s.getPoints(), ...s.holes.map((h) => h.getPoints())]) {
      const pts = loop.map((p) => new THREE.Vector3(p.x, p.y, 0));
      if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-3) pts.pop();
      if (pts.length < 3) continue;
      const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
      const len = curve.getLength();
      parts.push(new THREE.TubeGeometry(curve, Math.max(64, Math.round(len / 6)), radius, 10, true));
    }
  }
  return mergeGeometries(parts);
}

function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const count = nonIndexed.reduce((n, p) => n + p.getAttribute("position").count, 0);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let o = 0;
  for (const p of nonIndexed) {
    pos.set(p.getAttribute("position").array as Float32Array, o * 3);
    nor.set(p.getAttribute("normal").array as Float32Array, o * 3);
    o += p.getAttribute("position").count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return g;
}

/** A card behind the subject: litt's hairline grid, or display type (lines split on "\n"), drawn once. */
export function planeTexture(texture: "grid" | { text: string; size: number }, width: number, height: number, ink: string, canvas: string, family: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = Math.round(width);
  c.height = Math.round(height);
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.fillStyle = canvas;
  g.fillRect(0, 0, c.width, c.height);
  if (texture === "grid") {
    g.strokeStyle = ink;
    g.globalAlpha = 0.6;
    g.lineWidth = 2;
    const cell = 96;
    const ox = (c.width / 2) % cell;
    const oy = (c.height / 2) % cell;
    for (let x = ox; x <= c.width; x += cell) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, c.height);
      g.stroke();
    }
    for (let y = oy; y <= c.height; y += cell) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(c.width, y);
      g.stroke();
    }
  } else {
    g.fillStyle = ink;
    g.font = "500 " + texture.size + "px " + family;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const lines = texture.text.split("\n");
    const lead = texture.size * 1.05;
    lines.forEach((line, i) => g.fillText(line, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * lead));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Drawn near 1:1 behind the subject: bilinear is enough, and trilinear doubles the taps in software.
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
