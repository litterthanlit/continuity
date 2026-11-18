import { rel } from "../../paths.js";
import type { Finding } from "../../spec/findings.js";
import { flagBool, requireSlug, sceneFlag } from "../lib/args.js";
import { hfCheck } from "../lib/check.js";
import type { Command } from "../lib/command.js";
import { log, step } from "../lib/log.js";
import { probeProject } from "../lib/probe.js";
import { emitResult } from "../lib/result.js";
import { buildAndLint, buildSummary, report } from "../lib/project.js";
import { recordCheck } from "../lib/store.js";

export const check: Command = {
  name: "check",
  summary: "THE GATE: lint + browser audits (layout, overlap, contrast, motion assertions, safe areas, type size). Records the result on the current iteration.",
  usage:
    "ct check <project> [--scene <id>] [--deep] [--json] [--snapshots]\n" +
    "  --scene  isolated check of one scene (parallel builders); not the project gate\n" +
    "  --deep   also verify generated motion assertions in HyperFrames (slow; run before delivery)",
  async run(a) {
    const slug = requireSlug(a);
    const json = flagBool(a, "json");
    const scene = sceneFlag(a);
    const { build, findings } = await buildAndLint(slug, { scene });
    if (!json) log(buildSummary(build));
    const all: Finding[] = [...findings];
    if (build.ok) {
      if (!json) step("browser audit (HyperFrames check + Continuity probe)…");
      const [hf, probe] = await Promise.all([hfCheck(build, { snapshots: flagBool(a, "snapshots"), scene, deep: flagBool(a, "deep") }), probeProject(build, { scene })]);
      all.push(...hf.findings, ...probe);
    }
    // Scene mode builds the other scenes as placeholders: only this scene's findings count,
    // and the result is not the project gate.
    const scoped = scene ? all.filter((f) => !f.scene || f.scene === scene) : all;
    // The audit ran on the sources as they were when the build started (build.hash): the result
    // is recorded for those sources only, never for an edit that landed while it ran.
    const rec = recordCheck(slug, build.hash, scoped, scene);
    emitResult({ iteration: rec.iteration, scene: scene ?? null, findingsFile: rec.findingsFile });
    const passed = report(`check (iteration ${rec.iteration}${scene ? `, scene ${scene}` : ""})`, rec.findings, { json });
    if (!json && rec.findingsFile) log(`findings → ${rel(rec.findingsFile)}${scene ? "  (scene check — run the full `ct check` before calling the project done)" : ""}`);
    return passed ? 0 : 1;
  },
};
