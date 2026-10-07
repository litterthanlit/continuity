import { buildProject } from "../../build/build.js";
import { flagBool, requireSlug } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { buildSummary, report } from "../lib/project.js";
import { log } from "../lib/log.js";

export const build: Command = {
  name: "build",
  summary: "Compile a project into a HyperFrames composition (build/<slug>/).",
  usage: "ct build <project> [--json]",
  async run(a) {
    const slug = requireSlug(a);
    const b = await buildProject(slug);
    const json = flagBool(a, "json");
    if (!json) log(buildSummary(b));
    return report("build", b.findings, { json, quietOk: true }) ? 0 : 1;
  },
};
