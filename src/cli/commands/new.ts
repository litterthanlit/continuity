import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECTS_DIR, projectDir, rel } from "../../paths.js";
import { ASPECTS, type Aspect } from "../../spec/storyboard.js";
import { themes } from "../../themes/index.js";
import { flagStr, requireSlug, UsageError } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { log, ok } from "../lib/log.js";

export const newProject: Command = {
  name: "new",
  summary: "Scaffold a project from the template (brief, storyboard, one scene).",
  usage: "ct new <project> [--aspect 16:9|9:16|1:1|4:5] [--theme mono-dark|light-editorial|vivid-gradient] [--title \"…\"]",
  async run(a) {
    const slug = requireSlug(a);
    if (!/^[a-z][a-z0-9-]*$/.test(slug)) throw new UsageError("project names are lowercase kebab-case");
    const dir = projectDir(slug);
    if (existsSync(dir)) throw new UsageError(`${rel(dir)} already exists`);
    const aspect = (flagStr(a, "aspect") ?? "16:9") as Aspect;
    if (!(aspect in ASPECTS)) throw new UsageError(`--aspect must be one of ${Object.keys(ASPECTS).join(", ")}`);
    const theme = flagStr(a, "theme") ?? "mono-dark";
    if (!themes[theme]) throw new UsageError(`--theme must be one of ${Object.keys(themes).join(", ")}`);
    cpSync(join(PROJECTS_DIR, "_template"), dir, { recursive: true, filter: (src) => !src.includes(".continuity") });
    const sbPath = join(dir, "storyboard.json");
    const sb = JSON.parse(readFileSync(sbPath, "utf8"));
    sb.title = flagStr(a, "title") ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    sb.format.aspect = aspect;
    sb.theme = theme;
    writeFileSync(sbPath, JSON.stringify(sb, null, 2) + "\n");
    ok(`created ${rel(dir)}`);
    log(`next: fill ${rel(join(dir, "brief.md"))}, write the storyboard, then \`pnpm ct check ${slug}\``);
    return 0;
  },
};
