import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PKG_ROOT, PROJECTS_DIR, projectDir, rel } from "../../paths.js";
import { ASPECTS, type Aspect } from "../../spec/storyboard.js";
import { themes } from "../../themes/index.js";
import { KIT_NAMES, isKitName } from "../../themes/kits.js";
import { flagStr, requireSlug, UsageError } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { log, ok } from "../lib/log.js";
import { emitResult } from "../lib/result.js";

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
  usage:
    `ct new <project> [--aspect ${Object.keys(ASPECTS).join("|")}] [--theme ${Object.keys(themes).join("|")}] ` +
    `[--type ${[...KIT_NAMES, "classic"].join("|")}] [--title "…"]\n` +
    "  --type  type kit (font pairing); defaults to the theme's suggested kit. classic = the theme's v1 fonts",
  async run(a) {
    const slug = requireSlug(a);
    if (!/^[a-z][a-z0-9-]*$/.test(slug)) throw new UsageError("project names are lowercase kebab-case");
    const dir = projectDir(slug);
    if (existsSync(dir)) throw new UsageError(`${rel(dir)} already exists`);
    const aspect = (flagStr(a, "aspect") ?? "16:9") as Aspect;
    if (!(aspect in ASPECTS)) throw new UsageError(`--aspect must be one of ${Object.keys(ASPECTS).join(", ")}`);
    const theme = flagStr(a, "theme") ?? "mono-dark";
    if (!themes[theme]) throw new UsageError(`--theme must be one of ${Object.keys(themes).join(", ")}`);
    const type = flagStr(a, "type") ?? themes[theme].suggestedType ?? "classic";
    if (type !== "classic" && !isKitName(type)) throw new UsageError(`--type must be one of ${[...KIT_NAMES, "classic"].join(", ")}`);
    if (ensureEsmProjects()) ok(`wrote ${rel(join(PROJECTS_DIR, "package.json"))} (scene files are ES modules)`);
    cpSync(join(PKG_ROOT, "templates", "project"), dir, { recursive: true, filter: (src) => !src.includes(".continuity") });
    const sbPath = join(dir, "storyboard.json");
    const sb = JSON.parse(readFileSync(sbPath, "utf8"));
    sb.title = flagStr(a, "title") ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    sb.format.aspect = aspect;
    sb.theme = theme;
    if (type === "classic") delete sb.type;
    else sb.type = type;
    writeFileSync(sbPath, JSON.stringify(sb, null, 2) + "\n");
    emitResult({ slug, dir, aspect, theme, type, files: ["brief.md", "storyboard.json", "scenes/hook.tsx"].map((f) => join(dir, f)) });
    ok(`created ${rel(dir)}`);
    log(`next: fill ${rel(join(dir, "brief.md"))}, write the storyboard, then \`npx ct check ${slug}\``);
    return 0;
  },
};
