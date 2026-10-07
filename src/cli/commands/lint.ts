import { loadStoryboard } from "../../build/build.js";
import { sceneTimings } from "../../spec/storyboard.js";
import { flagBool, flagStr, requireSlug } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { buildAndLint, buildSummary, report } from "../lib/project.js";
import { log } from "../lib/log.js";

export const lint: Command = {
  name: "lint",
  summary: "Fast static gate: storyboard schema, build, timeline motion lint, HyperFrames lint. No browser.",
  usage:
    "ct lint <project> [--scene <id>] [--storyboard] [--fast] [--json]\n" +
    "  --scene       lint one scene in isolation (parallel builders)\n" +
    "  --storyboard  validate storyboard.json only (before any scene exists) and print timings\n" +
    "  --fast        skip HyperFrames lint (used by the edit hook)",
  async run(a) {
    const slug = requireSlug(a);
    const json = flagBool(a, "json");
    if (flagBool(a, "storyboard")) {
      const { storyboard, findings } = loadStoryboard(slug);
      if (storyboard && !json) {
        const t = sceneTimings(storyboard);
        log(`${storyboard.title} — ${storyboard.format.aspect} · ${t.duration}s · ${t.scenes.length} scenes`);
        t.scenes.forEach((s, i) => log(`  ${s.id.padEnd(16)} ${s.start.toFixed(2).padStart(6)}s +${storyboard.scenes[i].duration}s  ${storyboard.scenes[i].transition?.type ?? "cut"}`));
      }
      return report("storyboard", findings, { json }) ? 0 : 1;
    }
    const { build, findings } = await buildAndLint(slug, { hf: !flagBool(a, "fast"), scene: flagStr(a, "scene") });
    if (!json) log(buildSummary(build));
    return report("lint", findings, { json }) ? 0 : 1;
  },
};
