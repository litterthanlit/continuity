/**
 * Slow, browser-backed tests. Run with `CT_SLOW=1 pnpm test`.
 * - every seeded layout defect is caught by `ct check`
 * - golden frames: the engine + HyperFrames + Chrome still render _smoke, _type and
 *   _transitions the same (refresh deliberately with CT_UPDATE_GOLDEN=1 after a reviewed
 *   change; a missing golden is written on first run)
 * - the type kit cascade contract
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildProject } from "../src/build/build.js";
import { hfCheck } from "../src/cli/lib/check.js";
import { captureFrames } from "../src/cli/lib/frames.js";
import { probeProject } from "../src/cli/lib/probe.js";
import { serveDir, withBrowser } from "../src/cli/lib/browser.js";
import { PKG_ROOT as ROOT } from "../src/paths.js";
import { fieldScenes } from "./fixtures/field-scenes.js";

const slow = process.env.CT_SLOW === "1";
const d = slow ? describe : describe.skip;

d("seeded layout defects (projects/_defects-layout)", () => {
  it("every browser rule fires", async () => {
    const b = await buildProject("_defects-layout");
    expect(b.ok).toBe(true);
    const [hf, probe] = await Promise.all([hfCheck(b), probeProject(b)]);
    const ids = new Set([...hf.findings, ...probe].map((f) => `${f.source}:${f.rule}`));
    for (const r of [
      "probe:text-clipped",
      "probe:type-too-small",
      "probe:safe-area",
      "probe:collide-in-motion",
      "probe:font-face-missing",
      // counter-proportional stays in the probe, but every registry family has tabular figures now
      "check:contrast_aa_failure",
    ]) {
      expect(ids, r).toContain(r);
    }
  });
});

/**
 * Golden frames per project: coarse 48×27 greyscale signatures at fixed times.
 * _smoke guards the engine path; _type and _transitions guard litt's type and
 * the transition presentations (regenerated for litt, docs/decisions/0006); _energetic
 * guards the grid, Media, Marker and the depth transition (0007).
 */
const GOLDENS: Array<{ slug: string; times: number[] }> = [
  { slug: "_smoke", times: [0.5, 1.5, 3.4, 4.6] },
  // settled scale, weights, lockup; the ink line before and after it dims; the stat landed
  { slug: "_type", times: [1.3, 4.9, 9.0, 13.2, 14.4, 18.6] },
  // the intro settled, then each accent at its mid-point: crossfade, dip, push + blur, pushUp + blur, feathered wipe
  { slug: "_transitions", times: [1.2, 3.2, 6.15, 9.05, 11.95, 14.85] },
  // the energetic register (docs/decisions/0007): each scene settled, and depth in, the steep
  // blurred push and depth out at their mid-points
  { slug: "_energetic", times: [1.65, 2.9, 4.2, 5.2, 6.6, 7.7, 9.5] },
];

async function signature(file: string): Promise<number[]> {
  const raw = await sharp(file).greyscale().resize(48, 27, { fit: "fill" }).raw().toBuffer();
  return Array.from(raw);
}

for (const { slug, times } of GOLDENS) {
  d(`golden frames (${slug})`, () => {
    it("renders within tolerance of the goldens", async () => {
      const golden = join(ROOT, `tests/golden/${slug}.json`);
      const b = await buildProject(slug);
      expect(b.ok).toBe(true);
      const dir = mkdtempSync(join(tmpdir(), "ct-golden-"));
      const frames = await captureFrames(slug, times, dir);
      const sigs = await Promise.all(frames.map((f) => signature(f.file)));
      if (process.env.CT_UPDATE_GOLDEN === "1" || !existsSync(golden)) {
        mkdirSync(join(ROOT, "tests/golden"), { recursive: true });
        writeFileSync(golden, JSON.stringify({ times, size: [48, 27], frames: sigs }) + "\n");
        return;
      }
      const g = JSON.parse(readFileSync(golden, "utf8")) as { frames: number[][] };
      sigs.forEach((sig, i) => {
        const mad = sig.reduce((s, v, j) => s + Math.abs(v - g.frames[i][j]), 0) / sig.length;
        expect(mad, `frame @${times[i]}s mean abs diff`).toBeLessThan(2.5);
      });
    });
  });
}

d("type kit cascade contract (tests/fixtures/kit-cascade)", () => {
  it("litt's roles set family and weight by role; explicit utilities still win; synthesis is off", async () => {
    const out = mkdtempSync(join(tmpdir(), "ct-cascade-"));
    const b = await buildProject("kit-cascade", { srcDir: join(ROOT, "tests/fixtures/kit-cascade"), outDir: out });
    expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
    const srv = await serveDir(out);
    try {
      const got = await withBrowser(async (browser) => {
        const page = await browser.newPage();
        await page.goto(srv.url + "index.html", { waitUntil: "networkidle0" });
        await page.waitForFunction("Boolean(window.__ct)");
        await page.evaluate("window.__ct.ready");
        return (await page.evaluate(`(function () {
          var o = {};
          ["a.role", "a.title", "a.label", "a.body", "a.override", "a.mono"].forEach(function (id) {
            var cs = getComputedStyle(document.querySelector('[data-ct="' + id + '"]'));
            o[id] = { family: cs.fontFamily.split(",")[0].replace(/"/g, ""), weight: cs.fontWeight, transform: cs.textTransform,
              spacing: parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize), size: parseFloat(cs.fontSize), synth: cs.fontSynthesisWeight };
          });
          return o;
        })()`)) as Record<string, { family: string; weight: string; transform: string; spacing: number; size: number; synth: string }>;
      });
      expect(got["a.role"]).toMatchObject({ family: "Geist", weight: "500", size: 112, synth: "none" });
      expect(got["a.role"].spacing).toBeCloseTo(-0.04, 3);
      expect(got["a.title"]).toMatchObject({ family: "Geist", weight: "500", size: 48 });
      expect(got["a.label"]).toMatchObject({ family: "Geist", weight: "600", size: 28, transform: "none" });
      expect(got["a.body"]).toMatchObject({ family: "Geist", weight: "400", size: 36 });
      expect(got["a.override"].weight).toBe("400"); // utilities beat kit role rules
      expect(got["a.mono"]).toMatchObject({ family: "Geist Mono", weight: "400" });
    } finally {
      await srv.close();
    }
  });
});

d("measured geometry (projects/_launch: m.zoomTo, the match cut)", () => {
  it("the runtime fills in the zoom and the match from the layout, and the frames show them", async () => {
    const out = mkdtempSync(join(tmpdir(), "ct-measure-"));
    const b = await buildProject("_launch", { outDir: out });
    expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
    const srv = await serveDir(out);
    try {
      const got = await withBrowser(async (browser) => {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        await page.goto(srv.url + "index.html", { waitUntil: "load" });
        await page.waitForFunction("Boolean(window.__ct)");
        await page.evaluate("window.__ct.ready");
        return (await page.evaluate(`(function () {
          var ct = window.__ct, tl = ct.timeline;
          var intro = tl.scenes.find(function (s) { return s.scene === "intro"; });
          var input = tl.scenes.find(function (s) { return s.scene === "input"; });
          var zoom = input.tweens.find(function (t) { return t.measure && t.measure.kind === "focus"; });
          var match = input.tweens.find(function (t) { return t.measure && t.measure.kind === "match"; });
          function box(id) { var r = document.querySelector('[data-ct="' + id + '"]').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width }; }
          ct.seek(intro.start + intro.duration - 0.001);
          var word = box("intro.tool-3");
          ct.seek(input.start);
          var landed = box("input.brand");
          ct.seek(input.start + zoom.start + zoom.duration);
          var text = box("input.site-text");
          return { zoom: zoom.props, word: word, landed: landed, text: text, settle: match.props };
        })()`)) as { zoom: Record<string, [number | null, number]>; word: Box; landed: Box; text: Box; settle: Record<string, [number, number]> };
      });
      // The zoom pushes in until the typed domain is bigger than the frame (fill 1.4), centred as the edge allows.
      expect(got.zoom.scale[1]).toBeGreaterThan(2);
      expect(got.text.w).toBeGreaterThan(1920);
      // On the cut's first frame the label sits on the outgoing word: same centre, same width.
      expect(Math.abs(got.landed.cx - got.word.cx)).toBeLessThan(4);
      expect(Math.abs(got.landed.cy - got.word.cy)).toBeLessThan(4);
      expect(got.landed.w / got.word.w).toBeGreaterThan(0.8);
      expect(got.settle.x[1]).toBe(0);
    } finally {
      await srv.close();
    }
  });
});

interface Box {
  cx: number;
  cy: number;
  w: number;
}

/** Build `_backgrounds`, open it in a browser and run `script` (an expression) once the runtime is ready. */
async function inBackgrounds<T>(script: string): Promise<T> {
  const out = mkdtempSync(join(tmpdir(), "ct-gradient-"));
  const b = await buildProject("_backgrounds", { outDir: out });
  expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
  const srv = await serveDir(out);
  try {
    return await withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
      await page.goto(srv.url + "index.html", { waitUntil: "load" });
      await page.waitForFunction("Boolean(window.__ct)");
      await page.evaluate("window.__ct.ready");
      return (await page.evaluate(script)) as T;
    });
  } finally {
    await srv.close();
  }
}

// Page helpers: a scene's field canvas, its pixels as a data URL, and one pixel read through a 2D copy.
const FIELD_HELPERS = `
  var ct = window.__ct, tl = ct.timeline;
  function sc(id) { return tl.scenes.find(function (s) { return s.scene === id; }); }
  function field(id) { return document.querySelector('[data-ct-scene="' + id + '"] canvas[data-ct-gradient]'); }
  function centre(id) {
    var c = field(id), k = document.createElement("canvas");
    k.width = c.width; k.height = c.height;
    var g = k.getContext("2d"); g.drawImage(c, 0, 0);
    return Array.from(g.getImageData(c.width >> 1, c.height >> 1, 1, 1).data);
  }
  function sync() {
    document.querySelectorAll("canvas[data-ct-gradient]").forEach(function (c) {
      var g = c.getContext("webgl2"); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
    });
  }
`;

d("gradient fields (projects/_backgrounds)", () => {
  it("is a pure function of time: same t, same pixels; later t, different pixels", async () => {
    const got = await inBackgrounds<{ first: string; later: string; again: string; alpha: number[] }>(`(function () {
      ${FIELD_HELPERS}
      ct.seek(0.5); var first = field("a").toDataURL();
      var alpha = centre("a");
      ct.seek(1.5); var later = field("a").toDataURL();
      ct.seek(0.5); var again = field("a").toDataURL();
      return { first: first, later: later, again: again, alpha: alpha };
    })()`);
    // It draws: an opaque field, not the transparent canvas Task 2 left.
    expect(got.alpha[3]).toBe(255);
    expect(got.again).toBe(got.first);
    expect(got.later).not.toBe(got.first);
  });

  it("the field flows straight through a cut", async () => {
    const got = await inBackgrounds<{ lastA: number[]; firstB: number[]; sameA: string; sameB: string }>(`(function () {
      ${FIELD_HELPERS}
      var a = sc("a"), b = sc("b");
      ct.seek(a.start + a.duration - 1 / tl.fps); var lastA = centre("a");
      ct.seek(b.start); var firstB = centre("b");
      // Both scenes drawn at the same global time (a at its end, b at its start): the same field.
      ct.apply("a", b.start - a.start); var sameA = field("a").toDataURL();
      ct.apply("b", 0); var sameB = field("b").toDataURL();
      return { lastA: lastA, firstB: firstB, sameA: sameA, sameB: sameB };
    })()`);
    expect(got.lastA[3]).toBe(255);
    for (let k = 0; k < 3; k++) expect(Math.abs(got.lastA[k]! - got.firstB[k]!)).toBeLessThanOrEqual(2);
    expect(got.sameB).toBe(got.sameA);
  });

  it("stops before Chrome's WebGL context cap would blank a canvas", async () => {
    // 17 fields: the 17th context would evict the first without an error. The build flags it, and a
    // page built anyway refuses to prepare instead of rendering a blank backdrop.
    const out = mkdtempSync(join(tmpdir(), "ct-fields-"));
    const b = await buildProject("fields", { srcDir: fieldScenes(17), outDir: out });
    expect(b.findings.map((f) => f.rule)).toContain("webgl-contexts");
    const srv = await serveDir(out);
    try {
      const got = await withBrowser(async (browser) => {
        const page = await browser.newPage();
        await page.goto(srv.url + "index.html", { waitUntil: "load" });
        await page.waitForFunction("Boolean(window.__ct)");
        return (await page.evaluate(`window.__ct.ready.then(function () { return "ready"; }, function (e) { return String(e.message); })`)) as string;
      });
      expect(got).toMatch(/17 WebGL canvases \(0 GL shots, 17 gradient fields\)/);
    } finally {
      await srv.close();
    }
  });

  // A timing test inside a parallel suite: alone the field measures 13-16 ms a frame, but once, with
  // HyperFrames rendering beside it on the same 4 cores, 25.7 ms. A retry asks for one uncontended
  // run; the budget itself does not move (docs/decisions/0011 §5).
  it("fits the frame budget", { retry: 2 }, async () => {
    const got = await inBackgrounds<{ medianGradient: number; medianSolid: number }>(`(function () {
      ${FIELD_HELPERS}
      var a = sc("a");
      function median(xs) { xs.sort(function (p, q) { return p - q; }); return xs[xs.length >> 1]; }
      function run(offset) {
        var ms = [];
        for (var i = 0; i < 30; i++) {
          var s = performance.now();
          ct.seek(a.start + offset + (i * (a.duration - 0.1)) / 30);
          sync();
          ms.push(performance.now() - s);
        }
        return median(ms);
      }
      run(0.05);
      var medianGradient = run(0);
      document.querySelectorAll("canvas[data-ct-gradient]").forEach(function (c) { c.remove(); });
      var medianSolid = run(0.01);
      return { medianGradient: medianGradient, medianSolid: medianSolid };
    })()`);
    console.log(`gradient field: ${got.medianGradient.toFixed(1)} ms/frame median, ${got.medianSolid.toFixed(1)} ms without it`);
    expect(got.medianGradient - got.medianSolid).toBeLessThanOrEqual(25);
  });
});
