// Shared by the Continuity plugin hooks: find the repo's installed `ct` and its layout.
// Every hook is a silent no-op in repos that don't use Continuity.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const projectRoot = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();

/** The nearest `node_modules/.bin/ct` at or above the project root. */
export function findCt(root = projectRoot()) {
  for (let dir = root; ; dir = dirname(dir)) {
    for (const name of process.platform === "win32" ? ["ct.cmd", "ct"] : ["ct"]) {
      const bin = join(dir, "node_modules", ".bin", name);
      if (existsSync(bin)) return bin;
    }
    if (dirname(dir) === dir) return null;
  }
}

/** The repo's Continuity root (nearest continuity.json) and projects dir. */
export function layout(root = projectRoot()) {
  for (let dir = root; ; dir = dirname(dir)) {
    const cfg = join(dir, "continuity.json");
    if (existsSync(cfg)) {
      let projectsDir = "projects";
      try {
        projectsDir = JSON.parse(readFileSync(cfg, "utf8")).projectsDir || projectsDir;
      } catch {
        /* defaults */
      }
      return { root: dir, projectsDir };
    }
    if (dirname(dir) === dir) return null;
  }
}

export function runCt(bin, args, cwd, timeout) {
  return spawnSync(bin, args, { cwd, encoding: "utf8", timeout, shell: process.platform === "win32" });
}

export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}
