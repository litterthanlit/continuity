import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR, buildDir, rel } from "../../paths.js";
import { countBySeverity, formatFindings } from "../../spec/findings.js";
import { flagBool, flagNum, flagStr, requireSlug } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { probe, qc } from "../lib/ffmpeg.js";
import { runHf } from "../lib/hf.js";
import { color, fail, log, ok, secs, step, warn } from "../lib/log.js";
import { buildAndLint, buildSummary, report } from "../lib/project.js";
import { currentIteration, updateIteration, writeFindings } from "../lib/store.js";
import { emitResult } from "../lib/result.js";

const FORMATS = new Set(["mp4", "webm", "mov", "gif"]);

export const render: Command = {
  name: "render",
  summary: "Render the video (MP4 by default) and QC the encoded file (duration, resolution, black/frozen segments).",
  usage:
    "ct render <project> [--draft] [--quality looks|delivery] [--workers N] [--format mp4|webm|mov|gif] [--force]\n" +
    "  --draft   fast preview quality (use while iterating)\n" +
    "  --force   render even if lint reports errors",
  async run(a) {
    const slug = requireSlug(a);
    const draft = flagBool(a, "draft");
    const format = flagStr(a, "format") ?? "mp4";
    if (!FORMATS.has(format)) throw new Error(`--format must be one of ${[...FORMATS].join(", ")}`);
    const { build, findings } = await buildAndLint(slug, { hf: false });
    log(buildSummary(build));
    const c = countBySeverity(findings);
    if (!build.ok || (c.errors && !flagBool(a, "force"))) {
      report("lint", findings);
      fail("not rendering: fix errors above (or pass --force for a diagnostic render)");
      return 1;
    }
    const tl = build.timeline!;
    const it = currentIteration(slug);
    const outDir = join(OUT_DIR, slug);
    mkdirSync(outDir, { recursive: true });
    const name = `${slug}-${build.hash}${draft ? "-draft" : ""}.${format}`;
    const file = join(outDir, name);
    const quality = flagStr(a, "quality") ?? (draft ? "draft" : "looks");
    const workers = String(flagNum(a, "workers") ?? 4);
    step(`rendering ${tl.duration}s @${tl.fps}fps (${quality}, ${workers} workers)…`);
    const t0 = Date.now();
    let lastPct = -1;
    const r = await runHf(["render", buildDir(slug), "-o", file, "-q", quality, "-w", workers, "--format", format], {
      timeoutMs: 60 * 60_000,
      onLine: (line) => {
        const m = /^@hf-progress (.*)$/.exec(line);
        if (!m) return;
        try {
          const p = JSON.parse(m[1]) as { pct: number };
          const pct = Math.floor(p.pct / 10) * 10;
          if (pct > lastPct && process.stdout.isTTY) {
            lastPct = pct;
            process.stdout.write(color.dim(`  ${pct}%\r`));
          }
        } catch {
          /* ignore */
        }
      },
    });
    if (r.code !== 0) {
      emitResult({ ok: false, error: "render failed", log: (r.stdout + r.stderr).split("\n").filter((l) => !l.startsWith("@hf-progress")).slice(-30).join("\n") });
      fail("render failed");
      log((r.stdout + r.stderr).split("\n").filter((l) => !l.startsWith("@hf-progress")).slice(-30).join("\n"));
      return 1;
    }
    const elapsed = Date.now() - t0;
    const info = await probe(file);
    ok(`${rel(file)} · ${(info.size / 1e6).toFixed(1)} MB · ${info.width}×${info.height} · ${info.duration.toFixed(2)}s · rendered in ${secs(elapsed)}`);
    copyFileSync(file, join(outDir, `latest${draft ? "-draft" : ""}.${format}`));
    copyFileSync(file, join(it.dir, `render${draft ? "-draft" : ""}.${format}`));

    const qcFindings = format === "mp4" || format === "webm" || format === "mov" ? await qc(file, tl) : [];
    writeFindings(it.dir, "render-findings.json", qcFindings);
    updateIteration(slug, it.n, { render: { file: rel(file), draft, at: new Date().toISOString() } });
    const q = countBySeverity(qcFindings);
    emitResult({
      ok: q.errors === 0,
      iteration: it.n,
      output: file,
      latest: join(outDir, `latest${draft ? "-draft" : ""}.${format}`),
      draft,
      format,
      durationS: info.duration,
      sizeBytes: info.size,
      width: info.width,
      height: info.height,
      renderSeconds: elapsed / 1000,
      qc: qcFindings,
    });
    if (qcFindings.filter((f) => f.severity !== "info").length) log(formatFindings(qcFindings.filter((f) => f.severity !== "info")));
    if (q.errors) {
      fail(`render QC: ${q.errors} error(s)`);
      return 1;
    }
    if (q.warnings) warn(`render QC: ${q.warnings} warning(s)`);
    else ok("render QC clean");
    return 0;
  },
};
