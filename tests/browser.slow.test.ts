/**
 * Slow, browser-backed tests. Run with `CT_SLOW=1 pnpm test`.
 * - every seeded layout defect is caught by `ct check`
 * - golden frames: the engine + HyperFrames + Chrome still render _smoke, _type and
 *   _transitions the same (refresh deliberately with CT_UPDATE_GOLDEN=1 after a reviewed
 *   change; a missing golden is written on first run)
 * - the type kit cascade contract
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { buildProject } from "../src/build/build.js";
import { hfCheck } from "../src/cli/lib/check.js";
import { captureFrames } from "../src/cli/lib/frames.js";
import { probeProject } from "../src/cli/lib/probe.js";
import { serveDir, withBrowser } from "../src/cli/lib/browser.js";
import type { Timeline, Tween } from "../src/motion/types.js";
import { PKG_ROOT as ROOT } from "../src/paths.js";
import { carriedFilm, fieldScenes, greyOnFieldFilm, removeFixtureProjects } from "./fixtures/field-scenes.js";

const slow = process.env.CT_SLOW === "1";
const d = slow ? describe : describe.skip;

d("seeded layout defects (projects/_defects-layout)", () => {
  it("every browser rule fires", async () => {
    const b = await buildProject("_defects-layout");
    expect(b.ok).toBe(true);
    const [hf, probe] = await Promise.all([hfCheck(b), probeProject(b)]);
    const found = [...hf.findings, ...probe];
    const ids = new Set(found.map((f) => `${f.source}:${f.rule}`));
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
    // Text over a moving field: the contrast audit samples the rendered frame, canvas included (0011)
    expect(found.some((f) => f.rule === "contrast_aa_failure" && f.element?.endsWith("over-field"))).toBe(true);
  });
});

d("contrast over a moving field (docs/decisions/0011)", () => {
  afterAll(removeFixtureProjects);

  // HyperFrames audits contrast on five frames a film: in a long film a field scene gets one or none,
  // so a grey headline on `accent` passed the full check and failed only under --scene.
  it("the full check catches grey type on a field in a long film", async () => {
    const out = mkdtempSync(join(tmpdir(), "ct-grey-field-"));
    try {
      const b = await buildProject("grey-field", { srcDir: greyOnFieldFilm(30), outDir: out });
      expect(b.ok).toBe(true);
      const [hf, probe] = await Promise.all([hfCheck(b), probeProject(b)]);
      const grey = [...hf.findings, ...probe].filter((f) => f.rule === "contrast_aa_failure" && f.element === "field.grey");
      expect(grey.map((f) => f.severity)).toContain("error");
    } finally {
      rmSync(out, { recursive: true, force: true });
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

d("match cuts v2 (projects/_flow: chip → card)", () => {
  // The outgoing chip is accelerating right when the cut lands; the incoming card is a different
  // fill and corner. The label pair is text on no fill: it gets no paint.
  const HELPERS = `
    var ct = window.__ct, tl = ct.timeline, fps = tl.fps;
    function sc(id) { return tl.scenes.find(function (s) { return s.scene === id; }); }
    function el(id) { return document.querySelector('[data-ct="' + id + '"]'); }
    function box(id) { var r = el(id).getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }
    // Fill and corner as seen: the corner radius in frame px (the element's own px × its drawn scale).
    function look(id) {
      var e = el(id), cs = getComputedStyle(e), r = e.getBoundingClientRect(), k = r.width / e.offsetWidth;
      var rad = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, e.offsetWidth / 2, e.offsetHeight / 2);
      return { bg: cs.backgroundColor, radius: rad * k };
    }
    // The element's own fill and corner, without anything the timeline writes.
    function own(id) {
      var e = el(id), keep = e.style.cssText;
      e.style.backgroundColor = ""; e.style.borderRadius = ""; e.style.transform = "none";
      var o = look(id);
      e.style.cssText = keep;
      return o;
    }
    var A = sc("chip"), B = sc("card");
    function tweens(target, kind) { return B.tweens.filter(function (t) { return t.target === target && t.measure && t.measure.kind === kind; }); }
  `;

  it("the incoming element leaves the cut at its partner's speed, only slows, and lands at rest", async () => {
    const got = await inProject<{ vA: number[]; steps: number[][]; frames: number; off: number[] }>("_flow", `(function () {
      ${HELPERS}
      ct.seek(A.start + A.duration - 1 / fps - 0.0001); var a0 = box("chip.chip");
      ct.seek(B.start - 0.0001); var a1 = box("chip.chip");
      var d = tweens("card.card", "match")[0].duration, n = Math.round(d * fps), pts = [];
      for (var f = 0; f <= n + 3; f++) { ct.seek(B.start + f / fps); pts.push(box("card.card")); }
      var steps = pts.slice(1).map(function (p, i) { return [p.cx - pts[i].cx, p.cy - pts[i].cy]; });
      // Settled: on its own layout, nothing left over from the travel.
      var e = el("card.card"), keep = e.style.transform; e.style.transform = "none"; var home = box("card.card"); e.style.transform = keep;
      var last = pts[pts.length - 1];
      return { vA: [a1.cx - a0.cx, a1.cy - a0.cy], steps: steps, frames: n, off: [last.cx - home.cx, last.cy - home.cy] };
    })()`);
    const v = Math.hypot(got.vA[0], got.vA[1]);
    const speed = got.steps.map(([x, y]) => Math.hypot(x, y));
    const profile = `chip ${v.toFixed(1)} px/frame | card ${speed.map((n) => n.toFixed(1)).join(" ")}`;
    // The chip is moving right at the cut, fast enough to carry (≥ 60 px/s is 2 px a frame).
    expect(got.vA[0]).toBeGreaterThan(10);
    // The first frame after the cut is the chip's last step, as a vector.
    expect(Math.hypot(got.steps[0][0] - got.vA[0], got.steps[0][1] - got.vA[1]) / v, profile).toBeLessThanOrEqual(0.15);
    // Then it only slows: no coast-and-swoop, no faster than the chip, at rest by d.
    for (let k = 1; k < speed.length; k++) expect(speed[k], `frame ${k}: ${profile}`).toBeLessThanOrEqual(speed[k - 1] + 0.5);
    expect(Math.max(...speed), profile).toBeLessThanOrEqual(1.1 * v);
    expect(speed[got.frames], profile).toBeLessThan(0.5);
    expect(Math.hypot(got.off[0], got.off[1])).toBeLessThan(0.5);
  });

  it("the shape is matched: the first frame has the partner's fill and corner, then settles to its own", async () => {
    const got = await inProject<{ a: Look; b0: Look; bd: Look; ownB: Look }>("_flow", `(function () {
      ${HELPERS}
      ct.seek(B.start - 0.0001); var a = look("chip.chip");
      ct.seek(B.start); var b0 = look("card.card");
      var d = tweens("card.card", "matchShape")[0].duration;
      ct.seek(B.start + d + 0.05); var bd = look("card.card");
      return { a: a, b0: b0, bd: bd, ownB: own("card.card") };
    })()`);
    expect(got.a.bg).not.toBe(got.ownB.bg);
    expect(Math.abs(got.a.radius - got.ownB.radius)).toBeGreaterThan(4);
    expect(got.b0.bg).toBe(got.a.bg);
    expect(Math.abs(got.b0.radius - got.a.radius), `card ${got.b0.radius} vs chip ${got.a.radius}`).toBeLessThan(1.5);
    expect(got.bd.bg).toBe(got.ownB.bg);
    expect(Math.abs(got.bd.radius - got.ownB.radius)).toBeLessThan(0.5);
  });

  it("fill matches only between two solid fills: text on no fill gets no paint, and no error", async () => {
    const got = await inProject<{ shape: Array<{ props: Record<string, unknown>; paint?: unknown }>; bg: string }>("_flow", `(function () {
      ${HELPERS}
      ct.seek(B.start);
      return { shape: tweens("card.label", "matchShape").map(function (t) { return { props: t.props, paint: t.paint }; }), bg: getComputedStyle(el("card.label")).backgroundColor };
    })()`);
    expect(got.shape).toHaveLength(1);
    expect(got.shape[0].props).not.toHaveProperty("paint");
    expect(got.shape[0].paint).toBeUndefined();
    expect(got.bg).toBe("rgba(0, 0, 0, 0)");
  });

  it("resolves the same whatever order the build wrote the pair's tweens in", async () => {
    const read = `(function () {
      ${HELPERS}
      return ["match", "matchVelocity", "matchShape"].map(function (kind) {
        return tweens("card.card", kind)
          .map(function (t) { return { axis: t.measure.axis || "", props: t.props, ease: t.ease, easeName: t.easeName || "", paint: t.paint || null }; })
          .sort(function (p, q) { return p.axis < q.axis ? -1 : 1; });
      });
    })()`;
    const built = await inProject<unknown>("_flow", read);
    const reversed = await inProject<unknown>("_flow", read, (tl) => {
      const card = tl.scenes.find((s) => s.scene === "card")!;
      const at = card.tweens.flatMap((t, i) => (t.target === "card.card" && t.measure ? [i] : []));
      const pair = at.map((i) => card.tweens[i]).reverse();
      at.forEach((i, k) => (card.tweens[i] = pair[k]));
    });
    expect(reversed).toEqual(built);
    // The chip moves at the cut: the travel rides the shifts and the place keeps only the size.
    const [[place]] = built as Array<Array<{ props: Record<string, number[]> }>>;
    expect(place.props.x).toEqual([0, 0]);
  });

  it("leaves a corner the channel cannot draw alone: mixed corners, or a corner the scene animates", async () => {
    const shape = `(function () { ${HELPERS} return tweens("card.card", "matchShape")[0].props; })()`;
    const built = await inProject<Record<string, unknown>>("_flow", shape);
    expect(built).toHaveProperty("corner");
    // A card rounded on three corners (a stylesheet rule, so the shape read still sees it).
    const mixed = await inProject<Record<string, unknown>>("_flow", shape, (_tl, dir) => {
      const page = join(dir, "index.html");
      writeFileSync(page, readFileSync(page, "utf8").replace("</head>", '<style>[data-ct="card.card"] { border-top-left-radius: 0 }</style></head>'));
    });
    expect(mixed).not.toHaveProperty("corner");
    expect(mixed).toHaveProperty("paint");
    // The card's own corner tween, later in the scene: the match must not hold the channel over it.
    const animated = await inProject<Record<string, unknown>>("_flow", shape, (tl) => {
      const own: Tween = { target: "card.card", kind: "emphasis", start: 2, duration: 0.3, ease: { type: "linear" }, props: { corner: [24, 48] } };
      tl.scenes.find((sc) => sc.scene === "card")!.tweens.push(own);
    });
    expect(animated).not.toHaveProperty("corner");
  });

  it("built alone, a match v2 join degrades to today's match", async () => {
    for (const only of ["chip", "card"]) {
      const b = await buildProject("_flow", { write: false, only });
      expect(b.findings.filter((f) => f.severity === "error"), only).toEqual([]);
    }
  });
});

d("carry: the trailing edge shows the backdrop, never the frame behind it", () => {
  afterAll(removeFixtureProjects);
  // Mid-carry (the outgoing root 3 frames before the cut, the incoming one on the cut's first frame),
  // the strip of frame past the root's trailing edge against the strip just inside it.
  const cases = [
    { bg: "solid" as const, dir: "left", distance: 12 },
    { bg: "gradient" as const, dir: "left", distance: 12 },
    { bg: "gradient" as const, dir: "left", distance: 45 },
    { bg: "gradient" as const, dir: "up", distance: 45 },
  ];
  for (const c of cases) {
    it(`${c.bg}, ${c.dir} ${c.distance}`, async () => {
      const out = mkdtempSync(join(tmpdir(), "ct-carried-"));
      const b = await buildProject("carried", { srcDir: carriedFilm(c.bg, c), outDir: out });
      expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
      const srv = await serveDir(out);
      try {
        const shots = await withBrowser(async (browser) => {
          const page = await browser.newPage();
          await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
          await page.goto(srv.url + "index.html", { waitUntil: "load" });
          await page.waitForFunction("Boolean(window.__ct)");
          await page.evaluate("window.__ct.ready");
          const at = async (t: number) => {
            // The root's offset along the travel, as drawn.
            const off = (await page.evaluate(`(function () {
              window.__ct.seek(${t});
              var s = window.__ct.timeline.scenes.find(function (x) { return x.start <= ${t} + 1e-6 && ${t} < x.start + x.duration; });
              var r = document.querySelector('[data-ct-scene="' + s.scene + '"]').getBoundingClientRect();
              return ${c.dir === "up" ? "r.top" : "r.left"};
            })()`)) as number;
            return { off, png: (await page.screenshot({ type: "png" })) as Uint8Array };
          };
          return [await at(2 - 3 / 30), await at(2)];
        });
        for (const [k, shot] of shots.entries()) {
          const { data, info } = await sharp(shot.png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
          const vertical = c.dir === "up";
          const len = vertical ? info.height : info.width;
          // The root's trailing edge: the far side for the outgoing root (it left that way), the near side for the incoming one.
          const edge = Math.round(k === 0 ? shot.off + len : shot.off);
          expect(edge > 8 && edge < len - 8, `edge at ${edge}`).toBe(true);
          const strip = (from: number, to: number) => {
            let sum = 0;
            let n = 0;
            for (let a = Math.max(0, from); a < Math.min(len, to); a++)
              for (let o = 0; o < (vertical ? info.width : info.height); o += 4) {
                const [x, y] = vertical ? [o, a] : [a, o];
                const i = (y * info.width + x) * 3;
                sum += data[i] + data[i + 1] + data[i + 2];
                n += 3;
              }
            return sum / n;
          };
          // A field has its own slope: the seam is what the strips on either side of the edge
          // differ by beyond the slope the strips further out show.
          const [far0, near0, near1, far1] = [strip(edge - 15, edge - 9), strip(edge - 9, edge - 3), strip(edge + 3, edge + 9), strip(edge + 9, edge + 15)];
          const slope = (near0 - far0 + (far1 - near1)) / 2;
          const seam = Math.abs(near1 - near0 - 2 * slope);
          expect(seam, `${k === 0 ? "outgoing" : "incoming"} edge at ${edge}: ${[far0, near0, near1, far1].map((v) => v.toFixed(1)).join(" | ")}`).toBeLessThan(1);
        }
      } finally {
        await srv.close();
        rmSync(out, { recursive: true, force: true });
      }
    });
  }
});

interface Look {
  bg: string;
  radius: number;
}

interface Box {
  cx: number;
  cy: number;
  w: number;
}

/** Build `_backgrounds`, open it in a browser and run `script` (an expression) once the runtime is ready. */
const inBackgrounds = <T>(script: string): Promise<T> => inProject<T>("_backgrounds", script);

/**
 * Build a project, open it in a browser and run `script` (an expression) once the runtime is ready.
 * `edit` may rewrite the built timeline (or the page in `dir`) first.
 */
async function inProject<T>(slug: string, script: string, edit?: (timeline: Timeline, dir: string) => void): Promise<T> {
  const out = mkdtempSync(join(tmpdir(), "ct-project-"));
  const b = await buildProject(slug, { outDir: out });
  expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
  if (edit) {
    const file = join(out, "ct-data.js");
    const src = readFileSync(file, "utf8");
    const prefix = "window.__CT__ = ";
    const data = JSON.parse(src.slice(prefix.length, src.lastIndexOf(";"))) as { timeline: Timeline };
    edit(data.timeline, out);
    writeFileSync(file, prefix + JSON.stringify(data) + ";\n");
  }
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
    rmSync(out, { recursive: true, force: true });
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
  afterAll(removeFixtureProjects);

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
      rmSync(out, { recursive: true, force: true });
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
