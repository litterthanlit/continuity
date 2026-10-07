import { existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { buildProject } from "../../build/build.js";
import { resolveScene } from "../../motion/evaluate.js";
import { rel } from "../../paths.js";
import { formatFindings } from "../../spec/findings.js";
import { flagNum, flagStr, requireSlug, UsageError } from "../lib/args.js";
import { screenshotHtml, withBrowser } from "../lib/browser.js";
import type { Command } from "../lib/command.js";
import { analyzeEnergy, energyCurve, energyHtml } from "../lib/energy.js";
import { captureFrames } from "../lib/frames.js";
import { fail, log, ok, step } from "../lib/log.js";
import { onionSkin } from "../lib/onion.js";
import { buildFor } from "../lib/project.js";
import { sheetHtml } from "../lib/sheet.js";
import { currentIteration, readFindings, writeFindings } from "../lib/store.js";
import { render } from "./render.js";

export const motion: Command = {
  name: "motion",
  summary: "Motion-energy chart of the rendered cut (rhythm, dead zones, unexplained jolts) — the edit's cardiogram.",
  usage: "ct motion <project>   (uses this iteration's render; makes a draft render if there is none)",
  async run(a) {
    const slug = requireSlug(a);
    const b = await buildProject(slug, { write: false });
    if (!b.ok || !b.timeline) {
      fail("fix build errors first (ct lint)");
      return 1;
    }
    let it = currentIteration(slug);
    let file = ["render.mp4", "render-draft.mp4"].map((f) => join(it.dir, f)).find(existsSync);
    if (!file) {
      step("no render for this iteration — rendering a draft first");
      const code = await render.run({ _: [slug], flags: { draft: true } });
      if (code !== 0) return code;
      it = currentIteration(slug);
      file = join(it.dir, "render-draft.mp4");
    }
    step(`analysing ${rel(file)}`);
    const curve = await energyCurve(file);
    const an = analyzeEnergy(curve, b);
    const out = join(it.dir, "motion.png");
    await screenshotHtml(energyHtml(curve, an, b, `${b.storyboard!.title} — motion energy (iteration ${it.n})`), out, { width: 1568 });
    writeFileSync(join(it.dir, "motion.json"), JSON.stringify({ baseline: curve.baseline, ...an.stats, deadZones: an.deadZones, spikes: an.spikes }, null, 2) + "\n");
    const prior = readFindings(it.dir, "render-findings.json").filter((f) => !f.rule.startsWith("motion-"));
    writeFindings(it.dir, "render-findings.json", [...prior, ...an.findings]);
    if (an.findings.length) log(formatFindings(an.findings));
    ok(`${rel(out)} · active ${(an.stats.activeShare * 100).toFixed(0)}% of frames · ${an.deadZones.length} dead zone(s) · ${an.spikes.length} jolt(s)`);
    return 0;
  },
};

export const strip: Command = {
  name: "strip",
  summary: "Onion-skin + filmstrip of one motion window — see trajectories, direction and overlaps in a single image.",
  usage:
    "ct strip <project> --scene <id> [--from s --to s] [--frames 6]\n" +
    "  times are scene-local; default window = the scene's entrance choreography",
  async run(a) {
    const slug = requireSlug(a);
    const sceneId = flagStr(a, "scene");
    if (!sceneId) throw new UsageError("--scene is required");
    const b = await buildFor(slug, sceneId);
    if (!b.ok || !b.timeline) {
      fail("fix build errors first (ct lint)");
      return 1;
    }
    const sc = b.timeline.scenes.find((s) => s.scene === sceneId);
    if (!sc) throw new UsageError(`unknown scene "${sceneId}"`);
    const resolved = resolveScene(sc, b.partsEstimate).filter((r) => r.kind !== "transition");
    const defFrom = resolved.length ? Math.min(...resolved.map((r) => r.start)) : 0;
    const defTo = resolved.length ? Math.max(...resolved.filter((r) => r.kind === "enter").map((r) => r.start + r.duration), defFrom + 0.5) : sc.duration;
    const from = flagNum(a, "from") ?? defFrom;
    const to = Math.min(sc.duration - 0.02, flagNum(a, "to") ?? defTo);
    const n = Math.max(2, flagNum(a, "frames") ?? 6);
    const times = Array.from({ length: n }, (_, i) => Math.round((sc.start + from + ((to - from) * i) / (n - 1)) * 1000) / 1000);
    const it = currentIteration(slug);
    const dir = join(it.dir, `strip-${sceneId}`);
    step(`capturing ${n} frames of ${sceneId} (${from.toFixed(2)}–${to.toFixed(2)}s)`);
    const frames = await captureFrames(slug, times, dir, "s", b.dir);
    const onion = join(dir, "onion.png");
    await onionSkin(frames.map((f) => f.file), onion, { mode: b.theme?.mode ?? "dark", width: b.timeline.width >= b.timeline.height ? 1200 : 700 });
    const aspect = b.timeline.width / b.timeline.height;
    const html = sheetHtml({
      title: `${b.storyboard!.title} — ${sceneId} motion strip`,
      meta: `onion skin of ${n} frames, ${from.toFixed(2)}–${to.toFixed(2)}s (scene-local) · iteration ${it.n}`,
      cells: [
        { src: relative(dir, onion), label: "onion skin — faint = earlier" },
        ...frames.map((f) => ({ src: relative(dir, f.file), time: f.t, scene: sceneId })),
      ],
      cols: aspect >= 1 ? 3 : 4,
      aspect,
    });
    const out = join(it.dir, `strip-${sceneId}.png`);
    await withBrowser((browser) => screenshotHtml(html, out, { width: 1568, baseDir: dir, browser }));
    ok(`${rel(out)} — read it to judge paths, direction and overlaps`);
    return 0;
  },
};
