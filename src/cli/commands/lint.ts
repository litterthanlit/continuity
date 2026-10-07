import { flagBool, requireSlug } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { buildAndLint, buildSummary, report } from "../lib/project.js";
import { log } from "../lib/log.js";

export const lint: Command = {
  name: "lint",
  summary: "Fast static gate: storyboard schema, build, timeline motion lint, HyperFrames lint. No browser.",
  usage: "ct lint <project> [--fast] [--json]\n  --fast  skip HyperFrames lint (used by the edit hook)",
  async run(a) {
    const slug = requireSlug(a);
    const json = flagBool(a, "json");
    const { build, findings } = await buildAndLint(slug, { hf: !flagBool(a, "fast") });
    if (!json) log(buildSummary(build));
    return report("lint", findings, { json }) ? 0 : 1;
  },
};
