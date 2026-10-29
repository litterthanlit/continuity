/**
 * Shape morphing geometry: SVG paths → flattened polygons → shapes with matched
 * point counts, interpolated by one progress value.
 *
 * Pure and deterministic; bundled into the browser runtime (no Node, no DOM).
 *
 * A morph renders with `fill-rule="evenodd"`, so a hole is any contour inside
 * another regardless of winding. That lets contours be matched and reversed
 * freely: only the set of enclosed regions matters, not orientation.
 */

/** A closed polygon as a flat [x0, y0, x1, y1, …] list. */
export type Contour = number[];

export interface MorphData {
  /**
   * Every shape has the same number of contours, contour i has the same point
   * count in every shape, and start points are aligned (no twist between
   * neighbouring shapes). A contour that has no counterpart in a neighbouring
   * shape is a point (every vertex at its own centroid) there.
   */
  shapes: Contour[][];
}

const MIN_POINTS = 24;
const MAX_FLATTEN_SEGMENTS = 256;

// ---------------------------------------------------------------------------
// Path parsing

const COMMANDS = "MLHVCSQTAZ";
const NUMBER = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y;

/**
 * Every subpath of `d` as one closed polygon with curves flattened so chords
 * stay within `tolerance` path units of the true curve. Subpaths with fewer
 * than three distinct points are dropped (they enclose nothing).
 */
export function parsePath(d: string, tolerance = 0.25): Contour[] {
  const tol = Math.max(tolerance, 1e-6);
  const out: Contour[] = [];
  let cur: Contour = [];
  let i = 0;

  const skipSep = () => {
    while (i < d.length && (d[i] === "," || d[i] === " " || d[i] === "\t" || d[i] === "\n" || d[i] === "\r")) i++;
  };
  const num = (): number => {
    skipSep();
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(d);
    if (!m) throw new Error(`parsePath: expected a number at offset ${i} in "${d.slice(i, i + 20)}"`);
    i = NUMBER.lastIndex;
    return Number(m[0]);
  };
  const flag = (): boolean => {
    skipSep();
    const ch = d[i];
    if (ch !== "0" && ch !== "1") throw new Error(`parsePath: expected an arc flag at offset ${i}`);
    i++;
    return ch === "1";
  };

  // Pen state. ctrl is the last control point of a C/S (kind "C") or Q/T (kind "Q"),
  // which S and T reflect through the current point.
  let x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0;
  let ctrlKind: "C" | "Q" | null = null;

  const push = (px: number, py: number) => {
    const n = cur.length;
    if (n >= 2 && cur[n - 2] === px && cur[n - 1] === py) return;
    cur.push(px, py);
  };
  const close = () => {
    if (cur.length >= 4 && cur[0] === cur[cur.length - 2] && cur[1] === cur[cur.length - 1]) cur.length -= 2;
    if (cur.length >= 6) out.push(cur);
    cur = [];
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const dd = Math.max(Math.hypot(x - 2 * x1 + x2, y - 2 * y1 + y2), Math.hypot(x1 - 2 * x2 + x3, y1 - 2 * y2 + y3));
    const n = segments(0.75 * dd, tol);
    for (let k = 1; k < n; k++) {
      const t = k / n, u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
      push(a * x + b * x1 + c * x2 + e * x3, a * y + b * y1 + c * y2 + e * y3);
    }
    push(x3, y3);
    cx = x2; cy = y2; ctrlKind = "C"; x = x3; y = y3;
  };
  const quad = (x1: number, y1: number, x2: number, y2: number) => {
    const dd = Math.hypot(x - 2 * x1 + x2, y - 2 * y1 + y2);
    const n = segments(0.25 * dd, tol);
    for (let k = 1; k < n; k++) {
      const t = k / n, u = 1 - t;
      const a = u * u, b = 2 * u * t, c = t * t;
      push(a * x + b * x1 + c * x2, a * y + b * y1 + c * y2);
    }
    push(x2, y2);
    cx = x1; cy = y1; ctrlKind = "Q"; x = x2; y = y2;
  };
  const line = (px: number, py: number) => {
    push(px, py);
    x = px; y = py; ctrlKind = null;
  };

  let cmd = "";
  while (true) {
    skipSep();
    if (i >= d.length) break;
    const ch = d[i];
    if (COMMANDS.includes(ch.toUpperCase())) {
      cmd = ch;
      i++;
    } else if (cmd === "") {
      throw new Error(`parsePath: path must start with a command, got "${ch}"`);
    } else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    else if (cmd === "Z" || cmd === "z") throw new Error(`parsePath: data after Z at offset ${i}`);

    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M": {
        close();
        x = ox + num(); y = oy + num();
        sx = x; sy = y; ctrlKind = null;
        push(x, y);
        break;
      }
      case "L": line(ox + num(), oy + num()); break;
      case "H": line(ox + num(), y); break;
      case "V": line(x, oy + num()); break;
      case "C": cubic(ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()); break;
      case "S": {
        const x1 = ctrlKind === "C" ? 2 * x - cx : x, y1 = ctrlKind === "C" ? 2 * y - cy : y;
        cubic(x1, y1, ox + num(), oy + num(), ox + num(), oy + num());
        break;
      }
      case "Q": quad(ox + num(), oy + num(), ox + num(), oy + num()); break;
      case "T": {
        const x1 = ctrlKind === "Q" ? 2 * x - cx : x, y1 = ctrlKind === "Q" ? 2 * y - cy : y;
        quad(x1, y1, ox + num(), oy + num());
        break;
      }
      case "A": {
        const rx = num(), ry = num(), rot = num(), large = flag(), sweep = flag();
        const ex = ox + num(), ey = oy + num();
        arc(x, y, rx, ry, rot, large, sweep, ex, ey, tol, push);
        x = ex; y = ey; ctrlKind = null;
        break;
      }
      case "Z": {
        close();
        x = sx; y = sy; ctrlKind = null;
        break;
      }
    }
  }
  close();
  return out;
}

/** Uniform segment count so the chord error bound `k / n²` stays within tol. */
function segments(k: number, tol: number): number {
  return Math.min(MAX_FLATTEN_SEGMENTS, Math.max(1, Math.ceil(Math.sqrt(k / tol))));
}

/** SVG elliptical arc → polyline points (SVG 1.1 Appendix F.6: endpoint → centre parameterisation, radius correction). */
function arc(
  x1: number, y1: number, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean,
  x2: number, y2: number, tol: number, push: (x: number, y: number) => void,
): void {
  if (x1 === x2 && y1 === y2) return;
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (rx === 0 || ry === 0) { push(x2, y2); return; }
  const phi = (rotDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
  const rx2 = rx * rx, ry2 = ry * ry;
  const num = rx2 * ry2 - rx2 * yp * yp - ry2 * xp * xp, den = rx2 * yp * yp + ry2 * xp * xp;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * yp) / ry, cyp = (-coef * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ux = (xp - cxp) / rx, uy = (yp - cyp) / ry, vx = (-xp - cxp) / rx, vy = (-yp - cyp) / ry;
  const theta1 = Math.atan2(uy, ux);
  let delta = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  else if (sweep && delta < 0) delta += 2 * Math.PI;
  const r = Math.max(rx, ry);
  const step = tol >= r ? Math.PI / 2 : Math.min(Math.PI / 2, 2 * Math.acos(1 - tol / r));
  const n = Math.min(MAX_FLATTEN_SEGMENTS, Math.max(1, Math.ceil(Math.abs(delta) / step)));
  for (let k = 1; k < n; k++) {
    const t = theta1 + (delta * k) / n;
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    push(cos * ex - sin * ey + cx, sin * ex + cos * ey + cy);
  }
  push(x2, y2);
}

// ---------------------------------------------------------------------------
// Contour geometry

/** Signed area (shoelace); positive when the vertices run counter-clockwise in y-up space. */
export function areaOf(c: Contour): number {
  let a = 0;
  const n = c.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) a += c[j] * c[i + 1] - c[i] * c[j + 1];
  return a / 2;
}

export function boundsOf(cs: Contour[]): { x: number; y: number; width: number; height: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cs) {
    for (let i = 0; i < c.length; i += 2) {
      if (c[i] < x0) x0 = c[i];
      if (c[i] > x1) x1 = c[i];
      if (c[i + 1] < y0) y0 = c[i + 1];
      if (c[i + 1] > y1) y1 = c[i + 1];
    }
  }
  if (x0 === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function perimeterOf(c: Contour): number {
  let p = 0;
  const n = c.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) p += Math.hypot(c[i] - c[j], c[i + 1] - c[j + 1]);
  return p;
}

/** Area centroid; the vertex mean when the polygon is degenerate. */
function centroidOf(c: Contour): [number, number] {
  const n = c.length;
  if (n === 0) return [0, 0];
  const a = areaOf(c);
  if (Math.abs(a) > 1e-9) {
    let cx = 0, cy = 0;
    for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
      const w = c[j] * c[i + 1] - c[i] * c[j + 1];
      cx += (c[j] + c[i]) * w;
      cy += (c[j + 1] + c[i + 1]) * w;
    }
    return [cx / (6 * a), cy / (6 * a)];
  }
  let mx = 0, my = 0;
  for (let i = 0; i < n; i += 2) { mx += c[i]; my += c[i + 1]; }
  return [mx / (n / 2), my / (n / 2)];
}

/** `n` points evenly spaced by arc length around the closed contour, starting at its first point. */
export function resample(c: Contour, n: number): Contour {
  const out: Contour = [];
  if (n <= 0 || c.length < 2) return out;
  const m = c.length / 2;
  const total = perimeterOf(c);
  if (total === 0) {
    for (let k = 0; k < n; k++) out.push(c[0], c[1]);
    return out;
  }
  const step = total / n;
  let seg = 0;
  let ax = c[0], ay = c[1];
  let bx = c[2 % c.length], by = c[3 % c.length];
  let segLen = Math.hypot(bx - ax, by - ay);
  let walked = 0;
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (walked + segLen < target && seg < m - 1) {
      walked += segLen;
      seg++;
      ax = bx; ay = by;
      const next = ((seg + 1) % m) * 2;
      bx = c[next]; by = c[next + 1];
      segLen = Math.hypot(bx - ax, by - ay);
    }
    const t = segLen === 0 ? 0 : (target - walked) / segLen;
    out.push(ax + (bx - ax) * t, ay + (by - ay) * t);
  }
  return out;
}

/**
 * `n` points keeping every original vertex (so the endpoint of a morph is the
 * input exactly), with the extra points spread over the edges in proportion to
 * their length. Requires n ≥ the vertex count.
 */
function densify(c: Contour, n: number): Contour {
  const m = c.length / 2;
  const extra = n - m;
  const lengths: number[] = [];
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    lengths.push(Math.hypot(c[2 * j] - c[2 * i], c[2 * j + 1] - c[2 * i + 1]));
  }
  const total = lengths.reduce((a, b) => a + b, 0);
  const quota = lengths.map((l) => (total > 0 ? (extra * l) / total : 0));
  const counts = quota.map(Math.floor);
  const remainder = quota.map((q, i) => ({ i, frac: q - counts[i] })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  const missing = extra - counts.reduce((a, b) => a + b, 0);
  for (let k = 0; k < missing; k++) counts[remainder[k].i]++;
  const out: Contour = [];
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    out.push(c[2 * i], c[2 * i + 1]);
    for (let k = 1; k <= counts[i]; k++) {
      const t = k / (counts[i] + 1);
      out.push(c[2 * i] + (c[2 * j] - c[2 * i]) * t, c[2 * i + 1] + (c[2 * j + 1] - c[2 * i + 1]) * t);
    }
  }
  return out;
}

export function mapContours(cs: Contour[], f: (x: number, y: number) => [number, number]): Contour[] {
  return cs.map((c) => {
    const out: Contour = new Array<number>(c.length);
    for (let i = 0; i < c.length; i += 2) {
      const [x, y] = f(c[i], c[i + 1]);
      out[i] = x;
      out[i + 1] = y;
    }
    return out;
  });
}

/** "M x y L x y … Z" per contour, numbers rounded to `precision` decimals, never "-0". */
export function toPathD(contours: Contour[], precision = 2): string {
  const k = 10 ** precision;
  const fmt = (v: number) => {
    const r = Math.round(v * k) / k;
    return String(r === 0 ? 0 : r);
  };
  const parts: string[] = [];
  for (const c of contours) {
    if (c.length < 2) continue;
    let s = `M${fmt(c[0])} ${fmt(c[1])}`;
    for (let i = 2; i < c.length; i += 2) s += `L${fmt(c[i])} ${fmt(c[i + 1])}`;
    parts.push(s + "Z");
  }
  return parts.join("");
}

// ---------------------------------------------------------------------------
// Morph preparation

export function prepareMorph(paths: string[], opts: { samples?: number } = {}): MorphData {
  return prepareContours(paths.map((d) => parsePath(d)), opts);
}

/**
 * Builds the morph table from parsed shapes.
 *
 * Contours are assigned to slots by walking consecutive shapes: each contour of
 * the next shape, largest first, takes the free slot whose previous contour has
 * the nearest centroid; the rest open new slots. A slot with no contour in a
 * shape is a point there, at the centroid of the slot's nearest real contour,
 * so a lone contour grows from or collapses to a point.
 *
 * `samples` (default 240) is the point budget per shape, split across slots by
 * perimeter with at least 24 points each. A contour with no more vertices than
 * its budget keeps them all (its morph endpoint is exact); a denser one is
 * resampled evenly. Each neighbouring pair of a slot is then rotated and
 * possibly reversed to the start that minimises the summed squared vertex
 * distance.
 */
export function prepareContours(shapes: Contour[][], opts: { samples?: number } = {}): MorphData {
  const samples = Math.max(1, opts.samples ?? 240);
  const clean = shapes.map((s) => s.filter((c) => c.length >= 2));
  if (clean.length === 0) return { shapes: [] };

  // slots[s][i]: the contour of shape i in slot s, or null when the slot is a point there.
  const slots: (Contour | null)[][] = [];
  const byArea = (cs: Contour[]) => cs.map((c, i) => ({ c, i, area: Math.abs(areaOf(c)), centroid: centroidOf(c) })).sort((a, b) => b.area - a.area);
  for (const c of byArea(clean[0])) slots.push([c.c]);
  for (let i = 1; i < clean.length; i++) {
    const free = slots.map((_, s) => s).filter((s) => slots[s][i - 1] !== null);
    const freeCentroids = new Map(free.map((s) => [s, centroidOf(slots[s][i - 1]!)]));
    const placed = new Array<Contour | null>(slots.length).fill(null);
    for (const c of byArea(clean[i])) {
      let best = -1, bestDist = Infinity;
      for (const s of free) {
        if (placed[s]) continue;
        const [px, py] = freeCentroids.get(s)!;
        const dist = Math.hypot(px - c.centroid[0], py - c.centroid[1]);
        if (dist < bestDist) { bestDist = dist; best = s; }
      }
      if (best >= 0) placed[best] = c.c;
      else {
        slots.push(new Array<Contour | null>(i).fill(null));
        placed.push(c.c);
      }
    }
    for (let s = 0; s < slots.length; s++) slots[s].push(placed[s] ?? null);
  }

  const count = clean.length;
  const perimeters = slots.map((slot) => Math.max(...slot.map((c) => (c ? perimeterOf(c) : 0))));
  const totalPerimeter = perimeters.reduce((a, b) => a + b, 0);
  const budget = perimeters.map((p) => (totalPerimeter > 0 ? Math.max(MIN_POINTS, Math.round((samples * p) / totalPerimeter)) : MIN_POINTS));

  const result: Contour[][] = Array.from({ length: count }, () => []);
  slots.forEach((slot, s) => {
    const n = budget[s];
    const real = slot.map((c) => (c ? (c.length / 2 <= n ? densify(c, n) : resample(c, n)) : null));
    const nearestReal = (i: number): Contour => {
      for (let k = 0; k < count; k++) {
        if (i - k >= 0 && real[i - k]) return real[i - k]!;
        if (i + k < count && real[i + k]) return real[i + k]!;
      }
      throw new Error("prepareContours: empty slot");
    };
    const pointAt = (c: Contour): Contour => {
      const [cx, cy] = centroidOf(c);
      const out: Contour = [];
      for (let k = 0; k < n; k++) out.push(cx, cy);
      return out;
    };
    const chain: Contour[] = real.map((c, i) => c ?? pointAt(nearestReal(i)));
    for (let i = 1; i < count; i++) {
      if (real[i] && real[i - 1]) chain[i] = align(chain[i - 1], chain[i]);
    }
    chain.forEach((c, i) => result[i].push(c));
  });
  return { shapes: result };
}

/** `b` rotated (and reversed if that helps) to the start that minimises Σ|a_k − b_k|². */
function align(a: Contour, b: Contour): Contour {
  const n = b.length / 2;
  let best = Infinity, bestOffset = 0, bestReversed = false;
  for (const reversed of [false, true]) {
    for (let offset = 0; offset < n; offset++) {
      let sum = 0;
      for (let k = 0; k < n && sum < best; k++) {
        const j = reversed ? (offset - k + n) % n : (offset + k) % n;
        const dx = a[2 * k] - b[2 * j], dy = a[2 * k + 1] - b[2 * j + 1];
        sum += dx * dx + dy * dy;
      }
      if (sum < best) { best = sum; bestOffset = offset; bestReversed = reversed; }
    }
  }
  const out: Contour = new Array<number>(b.length);
  for (let k = 0; k < n; k++) {
    const j = bestReversed ? (bestOffset - k + n) % n : (bestOffset + k) % n;
    out[2 * k] = b[2 * j];
    out[2 * k + 1] = b[2 * j + 1];
  }
  return out;
}

/** Contours at progress `v` in [0, shapes.length − 1] (clamped), linear between neighbouring shapes. */
export function morphAt(data: MorphData, v: number): Contour[] {
  const last = data.shapes.length - 1;
  if (last < 0) return [];
  const p = Math.min(last, Math.max(0, Number.isFinite(v) ? v : 0));
  const i = Math.min(Math.floor(p), Math.max(0, last - 1));
  const t = p - i;
  const a = data.shapes[i];
  if (t === 0 || i === last) return a.map((c) => c.slice());
  const b = data.shapes[i + 1];
  return a.map((c, s) => {
    const d = b[s];
    const out: Contour = new Array<number>(c.length);
    for (let k = 0; k < c.length; k++) out[k] = c[k] + (d[k] - c[k]) * t;
    return out;
  });
}
