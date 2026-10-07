import { join } from "node:path";
import { rel } from "../../paths.js";
import { countBySeverity, type Finding } from "../../spec/findings.js";
import { flagBool, requireSlug } from "../lib/args.js";
import { hfCheck } from "../lib/check.js";
import type { Command } from "../lib/command.js";
import { log, step } from "../lib/log.js";
import { probeProject } from "../lib/probe.js";
import { buildAndLint, buildSummary, report } from "../lib/project.js";
import { currentIteration, updateIteration, writeFindings } from "../lib/store.js";

export const check: Command = {
  name: "check",
  summary: "THE GATE: lint + browser audits (layout, overlap, contrast, motion assertions, safe areas, type size). Records the result on the current iteration.",
  usage: "ct check <project> [--scene <id>] [--json] [--snapshots]",
  async run(a) {
    const slug = requireSlug(a);
    const json = flagBool(a, "json");
    const scene = typeof a.flags.scene === "string" ? a.flags.scene : undefined;
    const { build, findings } = await buildAndLint(slug);
    if (!json) log(buildSummary(build));
    const all: Finding[] = [...findings];
    if (build.ok) {
      if (!json) step("browser audit (HyperFrames check + Continuity probe)…");
      const [hf, probe] = await Promise.all([hfCheck(build, { snapshots: flagBool(a, "snapshots") }), probeProject(build)]);
      all.push(...hf.findings, ...probe);
    }
    const scoped = scene ? all.filter((f) => !f.scene || f.scene === scene) : all;
    const it = currentIteration(slug);
    writeFindings(it.dir, "findings.json", all);
    const c = countBySeverity(all);
    updateIteration(slug, it.n, { gate: { ok: c.errors === 0, errors: c.errors, warnings: c.warnings, at: new Date().toISOString() } });
    const passed = report(`check (iteration ${it.n}${scene ? `, scene ${scene}` : ""})`, scoped, { json });
    if (!json) log(`findings → ${rel(join(it.dir, "findings.json"))}`);
    return passed ? 0 : 1;
  },
};
