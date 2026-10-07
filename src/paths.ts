import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "src", "motion"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("Could not locate the Continuity repo root.");
}

export const ROOT = findRoot();
export const PROJECTS_DIR = join(ROOT, "projects");
export const BUILD_DIR = join(ROOT, "build");
export const OUT_DIR = join(ROOT, "out");
export const NODE_MODULES = join(ROOT, "node_modules");

export const projectDir = (slug: string) => join(PROJECTS_DIR, slug);
export const buildDir = (slug: string) => join(BUILD_DIR, slug);
/** Per-project evidence store (gitignored): iterations, stills, sheets, findings. */
export const stateDir = (slug: string) => join(PROJECTS_DIR, slug, ".continuity");

export const rel = (p: string) => (p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : resolve(p));
