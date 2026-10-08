import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

/**
 * The project-file sandbox: agents in clients without their own file tools can
 * read and write a project's *sources* — nothing else. Generated output (build/,
 * out/, .continuity/) and anything outside projects/<slug>/ are unreachable.
 */
/** Existing projects (fixtures may start with "_"); new ones are plain kebab-case. */
export const SLUG = /^_?[a-z][a-z0-9-]*$/;
export const NEW_SLUG = /^[a-z][a-z0-9-]*$/;
const ALLOWED = [
  /^brief\.md$/,
  /^treatment\.md$/,
  /^storyboard\.json$/,
  /^theme\.ts$/,
  /^scenes\/[a-z0-9][a-z0-9-]*\.tsx$/,
  /^lib\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(?:tsx?|json)$/i,
  /^assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(?:svg|json|css|txt)$/i,
];
export const MAX_BYTES = 512 * 1024;

export class SandboxError extends Error {}

export function projectPath(projectsDir: string, slug: string, path: string): string {
  if (!SLUG.test(slug)) throw new SandboxError(`invalid project slug "${slug}" (lowercase kebab-case)`);
  const p = path.replace(/^\.\//, "");
  if (p.split("/").some((seg) => seg === ".." || seg === "." || seg === "") || p.includes("\\") || p.startsWith("/")) {
    throw new SandboxError(`invalid path "${path}"`);
  }
  if (!ALLOWED.some((re) => re.test(p))) {
    throw new SandboxError(
      `"${path}" is not an editable project source. Allowed: brief.md, treatment.md, storyboard.json, theme.ts, scenes/<id>.tsx, lib/**/*.ts(x)|json, assets/**/*.svg|json|css|txt`,
    );
  }
  const projectDir = join(projectsDir, slug);
  const abs = join(projectDir, p);
  // Symlinks must not lead out of the project: check the deepest existing ancestor (or the file itself).
  if (existsSync(projectDir)) {
    let probe = abs;
    while (!existsSync(probe)) probe = dirname(probe);
    const real = realpathSync(probe);
    const realProject = realpathSync(projectDir);
    if (real !== realProject && !real.startsWith(realProject + sep)) throw new SandboxError(`"${path}" resolves outside the project`);
  }
  return abs;
}

export function readProjectFile(projectsDir: string, slug: string, path: string): string {
  const abs = projectPath(projectsDir, slug, path);
  if (!existsSync(abs)) throw new SandboxError(`${slug}/${path} does not exist`);
  if (statSync(abs).size > MAX_BYTES) throw new SandboxError(`${slug}/${path} is larger than ${MAX_BYTES} bytes`);
  return readFileSync(abs, "utf8");
}

export function writeProjectFile(projectsDir: string, slug: string, path: string, content: string): string {
  if (!existsSync(join(projectsDir, slug))) throw new SandboxError(`project "${slug}" does not exist — create it with new_project`);
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) throw new SandboxError(`content is larger than ${MAX_BYTES} bytes`);
  const abs = projectPath(projectsDir, slug, path);
  if (existsSync(abs) && lstatSync(abs).isSymbolicLink()) throw new SandboxError(`"${path}" is a symlink; refusing to write through it`);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return abs;
}

/** Source files of a project (what the sandbox can read), with sizes. */
export function listProjectFiles(projectsDir: string, slug: string): Array<{ path: string; bytes: number }> {
  if (!SLUG.test(slug)) throw new SandboxError(`invalid project slug "${slug}"`);
  const root = join(projectsDir, slug);
  if (!existsSync(root)) throw new SandboxError(`project "${slug}" does not exist`);
  const out: Array<{ path: string; bytes: number }> = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (name === ".continuity" || name === "node_modules") continue;
      const abs = join(dir, name);
      const st = lstatSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (st.isFile()) {
        const p = relative(root, abs).split(sep).join("/");
        if (ALLOWED.some((re) => re.test(p))) out.push({ path: p, bytes: st.size });
      }
    }
  };
  walk(root);
  return out;
}
