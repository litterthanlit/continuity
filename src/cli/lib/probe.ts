import type { BuildResult } from "../../build/build.js";
import type { Finding } from "../../spec/findings.js";
import { serveDir, withBrowser } from "./browser.js";
import { keyTimes } from "./times.js";

interface Measured {
  id: string;
  /** inside a UI-kit mockup */
  ui: boolean;
  /** px of text cut off by the nearest clipping ancestor */
  clip: number;
  /** data-ct ids of DOM ancestors */
  anc: string[];
  scene: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontPx: number;
  opacity: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Page-side measurement, shipped as plain JS (not a serialized TS function:
 * the TS loader would wrap named helpers in an `__name()` the page lacks).
 */
const MEASURE_SCRIPT = `
window.__ctMeasure = function (time) {
  window.__ct.seek(time);
  function visibleOpacity(el) {
    var o = 1;
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.display === "none") return 0;
      o *= Number(cs.opacity);
    }
    return o;
  }
  var out = [];
  document.querySelectorAll("[data-ct]").forEach(function (el) {
    if (el.closest("[data-layout-ignore]")) return;
    var id = el.getAttribute("data-ct");
    if (/\\.(scene|camera)$/.test(id)) return;
    var own = el.textContent || "";
    el.querySelectorAll("[data-ct]").forEach(function (c) { own = own.replace(c.textContent || "", ""); });
    if (own.replace(/\\s/g, "").length < 2) return;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    var opacity = visibleOpacity(el);
    if (opacity < 0.05) return;
    var scale = el.offsetWidth ? r.width / el.offsetWidth : 1;
    // Effective size of the text this element itself holds (not of its box).
    var fontPx = Infinity;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (var tn = walker.nextNode(); tn; tn = walker.nextNode()) {
      if (!tn.textContent || !tn.textContent.trim()) continue;
      var holder = tn.parentElement;
      // text owned by a nested animated element is measured on that element
      if (!holder || holder.closest("[data-ct]") !== el) continue;
      if (holder.closest("[data-layout-ignore]")) continue;
      fontPx = Math.min(fontPx, parseFloat(getComputedStyle(holder).fontSize) * scale);
    }
    if (!isFinite(fontPx)) return;
    // Text cut off by a clipping ancestor (window, card, mask) — ignoring our
    // own reveal masks and the scene/camera/stage wrappers.
    var clip = 0;
    // Measure the glyphs themselves (a Range), not the element box: a block
    // paragraph can be exactly as wide as its clipping parent while its text
    // runs past both.
    var range = document.createRange();
    range.selectNodeContents(el);
    var tr = range.getBoundingClientRect();
    if (tr.width < 1) tr = r;
    for (var q = el; q && q !== document.body; q = q.parentElement) {
      if (q.classList.contains("ct-m") || q.classList.contains("ct-l") || q.classList.contains("ct-li")) continue;
      if (q.classList.contains("ct-scene") || q.classList.contains("ct-camera") || q.classList.contains("ct-stage")) break;
      var qs = getComputedStyle(q);
      if (qs.overflowX !== "visible" || qs.overflowY !== "visible" || qs.clipPath !== "none") {
        var b = q.getBoundingClientRect();
        clip = Math.max(clip, b.left - tr.left, tr.right - b.right, b.top - tr.top, tr.bottom - b.bottom);
        break;
      }
    }
    var anc = [];
    for (var p = el.parentElement; p; p = p.parentElement) {
      var pid = p.getAttribute && p.getAttribute("data-ct");
      if (pid) anc.push(pid);
    }
    out.push({
      clip: clip,
      anc: anc,
      id: id,
      scene: id.slice(0, id.indexOf(".")),
      text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 60),
      x: r.left, y: r.top, w: r.width, h: r.height,
      fontPx: fontPx,
      ui: Boolean(el.closest("[data-ct-ui]")),
      opacity: opacity
    });
  });
  return out;
};
`;

/** Mid-points of entrances/exits: where text collides while moving. */
function midMotionTimes(build: BuildResult, max = 48): number[] {
  const set = new Set<number>();
  for (const sc of build.timeline!.scenes) {
    for (const t of sc.tweens) {
      if (t.kind !== "enter" && t.kind !== "exit" && t.kind !== "move") continue;
      set.add(Math.round((sc.start + t.start + t.duration * 0.5) * 1000) / 1000);
    }
  }
  let list = [...set].filter((t) => t < build.timeline!.duration).sort((a, b) => a - b);
  if (list.length > max) {
    const step = list.length / max;
    list = Array.from({ length: max }, (_, i) => list[Math.floor(i * step)]);
  }
  return list;
}

/**
 * Continuity probe: complements `hyperframes check` with design rules that
 * need our timeline semantics — safe areas at settled frames, minimum
 * effective type size, text-on-text collisions mid-motion, font loading.
 */
export async function probeProject(build: BuildResult, opts: { scene?: string } = {}): Promise<Finding[]> {
  if (!build.timeline || !build.storyboard) return [];
  const { width, height } = build.timeline;
  const portrait = height > width;
  const findings: Finding[] = [];
  const win = opts.scene ? build.timeline.scenes.find((s) => s.scene === opts.scene) : undefined;
  const inWin = (t: number) => !win || (t >= win.start && t <= win.start + win.duration);
  const settled = keyTimes(build).filter((k) => inWin(k.t));
  const moving = midMotionTimes(build).filter(inWin);
  const srv = await serveDir(build.dir);
  try {
    await withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String((e as Error).message ?? e)));
      await page.goto(srv.url + "index.html", { waitUntil: "networkidle0", timeout: 30_000 });
      await page.waitForFunction(() => Boolean((window as unknown as { __ct?: unknown }).__ct), { timeout: 15_000 });
      await page.evaluate(() => (window as unknown as { __ct: { ready: Promise<void> } }).__ct.ready);

      for (const e of errors) findings.push({ source: "probe", rule: "runtime-error", severity: "error", message: e });

      const fontIssues = await page.evaluate(() => {
        const fams = new Set<string>();
        document.querySelectorAll<HTMLElement>("[data-ct]").forEach((el) => {
          const f = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
          if (f) fams.add(f);
        });
        return [...fams].filter((f) => !document.fonts.check(`16px "${f}"`));
      });
      for (const f of fontIssues) {
        findings.push({ source: "probe", rule: "font-not-loaded", severity: "error", message: `font "${f}" is used but not loaded — text will render in a fallback face`, suggestion: "use a theme font family (font-display/font-sans/font-mono/font-serif)" });
      }

      await page.evaluate(MEASURE_SCRIPT);
      const measure = (t: number): Promise<Measured[]> =>
        page.evaluate((time: number) => (window as unknown as { __ctMeasure: (t: number) => Measured[] }).__ctMeasure(time), t);

      // Settled frames: safe area + type size.
      const safe = portrait
        ? { l: 0.06, r: 0.12, t: 0.1, b: 0.18, name: "social feed safe zone (UI overlays: top 10%, bottom 18%, right 12%)" }
        : { l: 0.05, r: 0.05, t: 0.05, b: 0.05, name: "title-safe area (inner 90%)" };
      const minWarn = portrait ? 34 : 26;
      const minErr = portrait ? 26 : 20;
      const seenSafe = new Set<string>();
      const seenSize = new Set<string>();
      const seenClip = new Set<string>();
      for (const k of settled) {
        for (const m of await measure(k.t)) {
          if (m.opacity < 0.5 || m.scene !== k.scene) continue;
          const outL = m.x < safe.l * width - 1;
          const outR = m.x + m.w > (1 - safe.r) * width + 1;
          const outT = m.y < safe.t * height - 1;
          const outB = m.y + m.h > (1 - safe.b) * height + 1;
          if ((outL || outR || outT || outB) && !seenSafe.has(m.id)) {
            seenSafe.add(m.id);
            const sides = [outL && "left", outR && "right", outT && "top", outB && "bottom"].filter(Boolean).join("/");
            findings.push({
              source: "probe",
              rule: "safe-area",
              severity: portrait ? "warning" : "error",
              scene: m.scene,
              element: m.id,
              time: k.t,
              bbox: { x: r2(m.x), y: r2(m.y), width: r2(m.w), height: r2(m.h) },
              message: `"${m.text}" sits outside the ${safe.name} on the ${sides}`,
              suggestion: portrait ? "wrap content in <Safe zone=\"social\">" : "wrap content in <Safe> (title-safe) or pull it inward",
            });
          }
          if (m.clip > 2 && !seenClip.has(m.id)) {
            seenClip.add(m.id);
            findings.push({
              source: "probe",
              rule: "text-clipped",
              severity: "error",
              scene: m.scene,
              element: m.id,
              time: k.t,
              bbox: { x: r2(m.x), y: r2(m.y), width: r2(m.w), height: r2(m.h) },
              message: `"${m.text}" is cut off by its container (${Math.round(m.clip)}px hidden)`,
              suggestion: "shorten the text, widen the container, or reduce the size — never let copy run under an edge",
            });
          }
          if (m.fontPx < minWarn - 0.5 && !seenSize.has(m.id)) {
            seenSize.add(m.id);
            findings.push({
              source: "probe",
              rule: "type-too-small",
              severity: m.fontPx < minErr ? "error" : "warning",
              scene: m.scene,
              element: m.id,
              time: k.t,
              message: `"${m.text}" renders at ${r2(m.fontPx)}px — below the ${minWarn}px legibility floor for ${portrait ? "9:16 feeds" : "1080p"}`,
              suggestion: `use text-caption (30px) or larger${portrait ? "; mobile viewers need ≥ 34px" : ""}`,
            });
          }
        }
      }

      // Mid-motion: text-on-text collisions within a scene.
      const seenPair = new Set<string>();
      for (const t of moving) {
        const ms = (await measure(t)).filter((m) => m.opacity >= 0.3);
        for (let i = 0; i < ms.length; i++) {
          for (let j = i + 1; j < ms.length; j++) {
            const a = ms[i];
            const b = ms[j];
            if (a.scene !== b.scene) continue;
            // UI layered over UI (a toast over a window) is composition, not a collision.
            if (a.ui && b.ui) continue;
            const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
            const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
            const inter = ix * iy;
            const smaller = Math.min(a.w * a.h, b.w * b.h);
            if (smaller <= 0 || inter / smaller < 0.12) continue;
            // nested (e.g. an accent span inside its headline) is not a collision
            if (a.anc.includes(b.id) || b.anc.includes(a.id)) continue;
            const key = [a.id, b.id].sort().join("|");
            if (seenPair.has(key)) continue;
            seenPair.add(key);
            findings.push({
              source: "probe",
              rule: "collide-in-motion",
              severity: "warning",
              scene: a.scene,
              element: a.id,
              time: t,
              message: `"${a.text}" and "${b.text}" overlap ${Math.round((inter / smaller) * 100)}% while moving`,
              suggestion: "offset their timing (exit before the next enters), or move along non-crossing paths",
              data: { other: b.id },
            });
          }
        }
      }
      await page.close();
    });
  } finally {
    await srv.close();
  }
  return findings;
}
