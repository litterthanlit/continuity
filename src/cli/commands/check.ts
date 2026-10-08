import { join } from "node:path";
import { rel } from "../../paths.js";
import { countBySeverity, type Finding } from "../../spec/findings.js";
import { flagBool, requireSlug } from "../lib/args.js";
import { hfCheck } from "../lib/check.js";
import type { Command } from "../lib/command.js";
import { log, step } from "../lib/log.js";
import { probeProject } from "../lib/probe.js";
import { emitResult } from "../lib/result.js";
import { buildAndLint, buildSummary, report } from "../lib/project.js";
import { currentIteration, updateIteration, writeFindings } from "../lib/store.js";

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
    const scene = typeof a.flags.scene === "string" ? a.flags.scene : undefined;
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
    const it = currentIteration(slug);
    writeFindings(it.dir, scene ? `findings-${scene}.json` : "findings.json", scoped);
    const c = countBySeverity(scoped);
    if (!scene) updateIteration(slug, it.n, { gate: { ok: c.errors === 0, errors: c.errors, warnings: c.warnings, at: new Date().toISOString() } });
    emitResult({ iteration: it.n, scene: scene ?? null, findingsFile: join(it.dir, scene ? `findings-${scene}.json` : "findings.json") });
    const passed = report(`check (iteration ${it.n}${scene ? `, scene ${scene}` : ""})`, scoped, { json });
    if (!json) log(`findings → ${rel(join(it.dir, scene ? `findings-${scene}.json` : "findings.json"))}${scene ? "  (scene check — run the full `ct check` before calling the project done)" : ""}`);
    return passed ? 0 : 1;
  },
};
