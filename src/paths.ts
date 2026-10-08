import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Two roots:
 * - PKG_ROOT — where the Continuity package itself lives (engine source, templates, runtime).
 *   In this repo it is the checkout; when installed it is `node_modules/@litterthanlit/continuity`.
 * - WORK_ROOT — the user's repo: where projects are read and build/out are written.
 */

function findPkgRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "src", "motion"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("Could not locate the Continuity package root.");
}

export const PKG_ROOT = findPkgRoot();
const pkgRequire = createRequire(join(PKG_ROOT, "package.json"));

/** Absolute path of a file inside one of the package's dependencies (e.g. a @fontsource woff2). */
export function resolveDep(spec: string): string {
  return pkgRequire.resolve(spec);
}

/** Directory of a dependency package (via its package.json, falling back to the module search path). */
export function depDir(name: string): string {
  try {
    return dirname(pkgRequire.resolve(`${name}/package.json`));
  } catch {
    for (const base of pkgRequire.resolve.paths(name) ?? []) {
      const d = join(base, name);
      if (existsSync(join(d, "package.json"))) return d;
    }
    throw new Error(`dependency not found: ${name}`);
  }
}

export interface WorkConfig {
  projectsDir: string;
  buildDir: string;
  outDir: string;
}

export const CONFIG_FILE = "continuity.json";
const DEFAULTS: WorkConfig = { projectsDir: "projects", buildDir: "build", outDir: "out" };

/** The user's repo: $CT_ROOT, else the nearest ancestor with continuity.json, else with package.json. */
export function findWorkRoot(cwd: string, env: NodeJS.ProcessEnv = process.env): string {
  if (env.CT_ROOT) return resolve(env.CT_ROOT);
  const ancestors: string[] = [];
  for (let dir = resolve(cwd); ; dir = dirname(dir)) {
    ancestors.push(dir);
    if (dirname(dir) === dir) break;
  }
  return (
    ancestors.find((d) => existsSync(join(d, CONFIG_FILE))) ??
    ancestors.find((d) => existsSync(join(d, "package.json"))) ??
    resolve(cwd)
  );
}

export function readWorkConfig(root: string): WorkConfig {
  const file = join(root, CONFIG_FILE);
  if (!existsSync(file)) return { ...DEFAULTS };
  let raw: Partial<WorkConfig> = {};
  try {
    raw = JSON.parse(readFileSync(file, "utf8")) as Partial<WorkConfig>;
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${(e as Error).message}`);
  }
  const pick = (k: keyof WorkConfig) => (typeof raw[k] === "string" && raw[k] ? (raw[k] as string) : DEFAULTS[k]);
  return { projectsDir: pick("projectsDir"), buildDir: pick("buildDir"), outDir: pick("outDir") };
}

export const WORK_ROOT = findWorkRoot(process.cwd());
export const WORK_CONFIG = readWorkConfig(WORK_ROOT);
export const PROJECTS_DIR = resolve(WORK_ROOT, WORK_CONFIG.projectsDir);
export const BUILD_DIR = resolve(WORK_ROOT, WORK_CONFIG.buildDir);
export const OUT_DIR = resolve(WORK_ROOT, WORK_CONFIG.outDir);

export const projectDir = (slug: string) => join(PROJECTS_DIR, slug);
export const buildDir = (slug: string) => join(BUILD_DIR, slug);
/** Per-project evidence store (gitignored): iterations, stills, sheets, findings. */
export const stateDir = (slug: string) => join(PROJECTS_DIR, slug, ".continuity");

/** A path as the user should read it: relative to their repo when inside it. */
export const rel = (p: string) => {
  const abs = resolve(p);
  return abs === WORK_ROOT || abs.startsWith(WORK_ROOT + sep) ? relative(WORK_ROOT, abs) || "." : abs;
};
