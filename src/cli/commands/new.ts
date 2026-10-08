import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PKG_ROOT, PROJECTS_DIR, projectDir, rel } from "../../paths.js";
import { ASPECTS, type Aspect } from "../../spec/storyboard.js";
import { themes } from "../../themes/index.js";
import { flagStr, requireSlug, UsageError } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { log, ok } from "../lib/log.js";

/** Scene files are ES modules; in a CommonJS repo, scope the projects dir as ESM. */
export function ensureEsmProjects(): boolean {
  for (let dir = PROJECTS_DIR; ; dir = dirname(dir)) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      if (JSON.parse(readFileSync(pj, "utf8")).type === "module") return false;
      break;
    }
    if (dirname(dir) === dir) break;
  }
  mkdirSync(PROJECTS_DIR, { recursive: true });
  writeFileSync(join(PROJECTS_DIR, "package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");
  return true;
}

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
    if (ensureEsmProjects()) ok(`wrote ${rel(join(PROJECTS_DIR, "package.json"))} (scene files are ES modules)`);
    cpSync(join(PKG_ROOT, "templates", "project"), dir, { recursive: true, filter: (src) => !src.includes(".continuity") });
    const sbPath = join(dir, "storyboard.json");
    const sb = JSON.parse(readFileSync(sbPath, "utf8"));
    sb.title = flagStr(a, "title") ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    sb.format.aspect = aspect;
    sb.theme = theme;
    writeFileSync(sbPath, JSON.stringify(sb, null, 2) + "\n");
    ok(`created ${rel(dir)}`);
    log(`next: fill ${rel(join(dir, "brief.md"))}, write the storyboard, then \`npx ct check ${slug}\``);
    return 0;
  },
};
