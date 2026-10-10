/**
 * Slow, browser-backed tests. Run with `CT_SLOW=1 pnpm test`.
 * - every seeded layout defect is caught by `ct check`
 * - golden frames: the engine + HyperFrames + Chrome still render _smoke the same
 *   (refresh goldens deliberately with CT_UPDATE_GOLDEN=1 after a reviewed change)
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

const GOLDEN = join(ROOT, "tests/golden/_smoke.json");
const TIMES = [0.5, 1.5, 3.4, 4.6];

async function signature(file: string): Promise<number[]> {
  const raw = await sharp(file).greyscale().resize(48, 27, { fit: "fill" }).raw().toBuffer();
  return Array.from(raw);
}

d("golden frames (_smoke)", () => {
  it("renders within tolerance of the goldens", async () => {
    const b = await buildProject("_smoke");
    expect(b.ok).toBe(true);
    const dir = mkdtempSync(join(tmpdir(), "ct-golden-"));
    const frames = await captureFrames("_smoke", TIMES, dir);
    const sigs = await Promise.all(frames.map((f) => signature(f.file)));
    if (process.env.CT_UPDATE_GOLDEN === "1" || !existsSync(GOLDEN)) {
      mkdirSync(join(ROOT, "tests/golden"), { recursive: true });
      writeFileSync(GOLDEN, JSON.stringify({ times: TIMES, size: [48, 27], frames: sigs }) + "\n");
      return;
    }
    const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as { frames: number[][] };
    sigs.forEach((sig, i) => {
      const mad = sig.reduce((s, v, j) => s + Math.abs(v - golden.frames[i][j]), 0) / sig.length;
      expect(mad, `frame @${TIMES[i]}s mean abs diff`).toBeLessThan(2.5);
    });
  });
});
