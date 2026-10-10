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
      "probe:counter-proportional",
      "check:contrast_aa_failure",
    ]) {
      expect(ids, r).toContain(r);
    }
  });
});

/**
 * Golden frames per project: coarse 48×27 greyscale signatures at fixed times.
 * _smoke guards the classic engine path (never refreshed by v2 work); _type and
 * _transitions guard the kits and the transition presentations.
 */
const GOLDENS: Array<{ slug: string; times: number[] }> = [
  { slug: "_smoke", times: [0.5, 1.5, 3.4, 4.6] },
  // settled specimen per kit, wonk's soft-in and flexion's width wave mid-motion
  { slug: "_type", times: [2.5, 6.3, 8.55, 10.1, 13.9, 17.7, 20.85, 21.5] },
  // mid-transition: push+blur, whip, punch-cut flash frame, feathered wipe, iris, strips, light sweep
  { slug: "_transitions", times: [7.35, 12.035, 14.5, 16.85, 19.1, 21.3, 23.6] },
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
  it("kit roles set weight/width/case; explicit utilities still win; scene kits are scoped", async () => {
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
          ["a.role", "a.bold", "a.label", "a.wide", "a.accent", "b.role", "b.accent"].forEach(function (id) {
            var cs = getComputedStyle(document.querySelector('[data-ct="' + id + '"]'));
            o[id] = { family: cs.fontFamily.split(",")[0].replace(/"/g, ""), weight: cs.fontWeight, stretch: cs.fontStretch,
              transform: cs.textTransform, spacing: parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize), size: parseFloat(cs.fontSize), synth: cs.fontSynthesisWeight };
          });
          return o;
        })()`)) as Record<string, { family: string; weight: string; stretch: string; transform: string; spacing: number; size: number; synth: string }>;
      });
      expect(got["a.role"]).toMatchObject({ family: "Newsreader", weight: "340", synth: "none" });
      expect(got["a.bold"].weight).toBe("700"); // utilities beat kit role rules
      expect(got["a.label"]).toMatchObject({ family: "Geist Mono", transform: "uppercase" });
      expect(got["a.label"].spacing).toBeCloseTo(0.16, 2);
      expect(got["a.wide"].spacing).toBeCloseTo(0.3, 2);
      expect(got["a.accent"]).toMatchObject({ family: "Newsreader", weight: "340" });
      expect(got["b.role"]).toMatchObject({ family: "Archivo", weight: "850", stretch: "66%", transform: "uppercase" });
      expect(got["b.accent"]).toMatchObject({ family: "Instrument Serif", weight: "400", transform: "none" });
      expect(got["b.accent"].size / got["b.role"].size).toBeCloseTo(1.03, 2);
    } finally {
      await srv.close();
    }
  });
});
