import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { CONFIG_FILE, PKG_ROOT, PROJECTS_DIR, WORK_CONFIG, WORK_ROOT, depDir, rel } from "../../paths.js";
import type { Command } from "../lib/command.js";
import { color, log, ok } from "../lib/log.js";
import { emitResult } from "../lib/result.js";
import { doctor } from "./doctor.js";
import { ensureEsmProjects } from "./new.js";

const BEGIN = "<!-- continuity:begin (managed by `npx ct init`) -->";
const END = "<!-- continuity:end -->";
const PERMISSIONS = ["Bash(npx ct:*)", "Bash(ffprobe:*)"];

const template = (name: string) => readFileSync(join(PKG_ROOT, "templates", "init", name), "utf8");
const posix = (p: string) => p.split("\\").join("/");

function writeIfMissing(file: string, content: string): boolean {
  if (existsSync(file)) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return true;
}

/** Replace the managed block in `file` (or append it) — re-running init refreshes it, never duplicates it. */
function upsertBlock(file: string, block: string, wrap: (s: string) => string): "created" | "updated" | "unchanged" {
  const managed = wrap(block.trim());
  if (!existsSync(file)) {
    writeFileSync(file, managed + "\n");
    return "created";
  }
  const cur = readFileSync(file, "utf8");
  const begin = cur.indexOf(wrap("").split("\n")[0]);
  let next: string;
  if (begin >= 0) {
    const endMarker = wrap("").split("\n").at(-1)!;
    const end = cur.indexOf(endMarker, begin);
    next = cur.slice(0, begin) + managed + (end >= 0 ? cur.slice(end + endMarker.length) : "\n");
  } else next = cur.replace(/\n*$/, "\n\n") + managed + "\n";
  if (next === cur) return "unchanged";
  writeFileSync(file, next);
  return "updated";
}

/**
 * Editor support for scene files: `continuity` and preact resolve to the installed
 * package's copies (the same ones `ct` aliases at run time). Lives in the projects
 * dir so it never touches the repo's own tsconfig; re-run init after upgrading.
 */
function projectsTsconfig(): string {
  const from = PROJECTS_DIR;
  const to = (p: string) => posix(relative(from, p));
  const preact = depDir("preact");
  return (
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          lib: ["ES2023", "DOM", "DOM.Iterable"],
          jsx: "react-jsx",
          jsxImportSource: "preact",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          isolatedModules: true,
          paths: {
            continuity: [to(join(PKG_ROOT, "src", "index.ts"))],
            preact: [to(preact)],
            "preact/*": [to(preact) + "/*"],
          },
        },
        include: ["./**/*"],
        exclude: ["./*/.continuity"],
      },
      null,
      2,
    ) + "\n"
  );
}

function mergePermissions(file: string): string[] {
  let settings: { permissions?: { allow?: string[] } } & Record<string, unknown> = {};
  if (existsSync(file)) settings = JSON.parse(readFileSync(file, "utf8"));
  const allow = (settings.permissions ??= {}).allow ?? [];
  const added = PERMISSIONS.filter((p) => !allow.includes(p));
  if (!added.length) return [];
  settings.permissions.allow = [...allow, ...added];
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
  return added;
}

export const init: Command = {
  name: "init",
  summary: "Set up this repo for Continuity: config, projects dir, .gitignore, CLAUDE.md rules, Claude Code permissions.",
  usage: "ct init [--no-claude]",
  async run(a) {
    const changes: string[] = [];
    const done = (what: string) => {
      changes.push(what);
      ok(what);
    };
    const skipClaude = a.flags["no-claude"] === true || a.flags.claude === "false";
    log(color.bold(`Continuity → ${WORK_ROOT}`));

    if (writeIfMissing(join(WORK_ROOT, CONFIG_FILE), JSON.stringify(WORK_CONFIG, null, 2) + "\n")) done(`wrote ${CONFIG_FILE}`);
    mkdirSync(PROJECTS_DIR, { recursive: true });
    if (ensureEsmProjects()) done(`wrote ${rel(join(PROJECTS_DIR, "package.json"))} (scene files are ES modules)`);
    const tsconfig = join(PROJECTS_DIR, "tsconfig.json");
    const tsNext = projectsTsconfig();
    if (!existsSync(tsconfig) || readFileSync(tsconfig, "utf8") !== tsNext) {
      writeFileSync(tsconfig, tsNext);
      done(`wrote ${rel(tsconfig)} (editor types for scene files)`);
    }

    const ignore = template("gitignore")
      .replaceAll("{{projects}}", posix(WORK_CONFIG.projectsDir))
      .replaceAll("{{build}}", posix(WORK_CONFIG.buildDir))
      .replaceAll("{{out}}", posix(WORK_CONFIG.outDir));
    const gi = upsertBlock(join(WORK_ROOT, ".gitignore"), ignore, (s) => `# continuity:begin\n${s}\n# continuity:end`);
    if (gi !== "unchanged") done(`${gi} .gitignore`);

    if (!skipClaude) {
      const md = upsertBlock(join(WORK_ROOT, "CLAUDE.md"), template("CLAUDE.md"), (s) => `${BEGIN}\n${s}\n${END}`);
      if (md !== "unchanged") done(`${md} CLAUDE.md (Continuity rules for agents)`);
      const added = mergePermissions(join(WORK_ROOT, ".claude", "settings.json"));
      if (added.length) done(`allowed ${added.join(", ")} in .claude/settings.json`);
    }

    log(`
${color.bold("Next")}
  1. In Claude Code, add the agent layer (skills, director/scene-builder/critic agents, hooks):
       /plugin marketplace add litterthanlit/continuity
       /plugin install continuity@continuity
  2. Make a video:  /continuity:make-video <your brief>
     or by hand:    npx ct new <slug> --aspect 16:9  →  npx ct check <slug>  →  npx ct render <slug>
`);
    emitResult({ root: WORK_ROOT, projectsDir: PROJECTS_DIR, changes });
    // Toolchain gaps (no Chrome yet, no ffmpeg) don't fail setup; doctor says what to install.
    if ((await doctor.run(a)) !== 0) log("Fix the issues above before checking or rendering (`npx ct doctor` re-checks).");
    return 0;
  },
};
