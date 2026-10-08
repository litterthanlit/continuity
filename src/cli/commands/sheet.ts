import { join, relative } from "node:path";
import { rel } from "../../paths.js";
import { flagBool, flagNum, flagStr, requireSlug } from "../lib/args.js";
import { withBrowser, screenshotHtml } from "../lib/browser.js";
import type { Command } from "../lib/command.js";
import { captureFrames } from "../lib/frames.js";
import { fail, log, ok, step } from "../lib/log.js";
import { buildFor, report } from "../lib/project.js";
import { defaultCols, sheetHtml } from "../lib/sheet.js";
import { currentIteration, readFindings } from "../lib/store.js";
import { gridTimes } from "../lib/times.js";
import { emitResult } from "../lib/result.js";

export const sheet: Command = {
  name: "sheet",
  summary: "Timecoded contact sheet(s) — see the whole edit's rhythm and composition at a glance.",
  usage:
    "ct sheet <project> [--every 0.5] [--scene <id>] [--anchors] [--per 20]\n" +
    "  --every    seconds between frames (default: fits ~20 frames per sheet)\n" +
    "  --anchors  overlay the 6×6 A1–F6 anchor grid (for precise critique)\n" +
    "  --per      frames per sheet image (default 20)",
  async run(a) {
    const slug = requireSlug(a);
    const b = await buildFor(slug, flagStr(a, "scene"));
    if (!b.ok || !b.timeline) {
      report("build", b.findings);
      fail("fix build errors first (ct lint)");
      return 1;
    }
    const tl = b.timeline;
    const scene = flagStr(a, "scene");
    const span = scene ? tl.scenes.find((s) => s.scene === scene)?.duration ?? tl.duration : tl.duration;
    const per = flagNum(a, "per") ?? 20;
    const every = flagNum(a, "every") ?? Math.max(0.25, Math.ceil((span / per) * 4) / 4);
    const points = gridTimes(b, every, scene);
    const it = currentIteration(slug);
    const framesDir = join(it.dir, "frames");
    step(`capturing ${points.length} frames every ${every}s → iteration ${it.n}`);
    const frames = await captureFrames(slug, points.map((p) => p.t), framesDir, "g", b.dir);
    const findings = readFindings(it.dir, "findings.json");
    const flagAt = (t: number) => {
      const near = findings.filter((f) => f.time !== undefined && Math.abs(f.time - t) <= every / 2 && f.severity !== "info");
      return near.some((f) => f.severity === "error") ? ("error" as const) : near.length ? ("warning" as const) : undefined;
    };
    const aspect = tl.width / tl.height;
    const cols = defaultCols(aspect);
    const outs: string[] = [];
    await withBrowser(async (browser) => {
      for (let i = 0; i < frames.length; i += per) {
        const chunk = frames.slice(i, i + per);
        const pageN = Math.floor(i / per) + 1;
        const total = Math.ceil(frames.length / per);
        const html = sheetHtml({
          title: `${b.storyboard!.title} — contact sheet${total > 1 ? ` ${pageN}/${total}` : ""}`,
          meta: `${slug} · iteration ${it.n} · ${tl.width}×${tl.height} · every ${every}s · ${b.hash}`,
          cells: chunk.map((f) => {
            const p = points.find((x) => Math.abs(x.t - f.t) < 0.002);
            return { src: relative(it.dir, f.file), time: f.t, scene: p?.scene, flag: flagAt(f.t) };
          }),
          cols,
          aspect,
          anchors: flagBool(a, "anchors"),
          footer: frames.some((f) => flagAt(f.t)) ? "ring = gate findings near this time (red error, amber warning)" : undefined,
        });
        const out = join(it.dir, total > 1 ? `sheet-${pageN}.png` : "sheet.png");
        await screenshotHtml(html, out, { width: 1568, baseDir: it.dir, browser });
        outs.push(out);
      }
    });
    emitResult({ iteration: it.n, every, frames: frames.length, sheets: outs });
    for (const o of outs) log(`  ${rel(o)}`);
    ok(`${outs.length} sheet(s) from ${frames.length} frames. Read them to judge rhythm, hierarchy and continuity.`);
    return 0;
  },
};
