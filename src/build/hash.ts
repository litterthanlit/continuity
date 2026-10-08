import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PKG_ROOT, projectDir } from "../paths.js";

const SKIP = new Set([".continuity", "node_modules", ".DS_Store"]);

function walk(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}

function hashFiles(files: string[], base = PKG_ROOT): string {
  const h = createHash("sha256");
  for (const f of files) {
    h.update(relative(base, f));
    h.update("\0");
    h.update(readFileSync(f));
    h.update("\0");
  }
  return h.digest("hex").slice(0, 12);
}

/** Identity of everything that affects a project's render: its sources + the engine. */
export function sourceHash(slug: string, dir = projectDir(slug)): { project: string; engine: string; combined: string } {
  const pf: string[] = [];
  walk(dir, pf);
  const ef: string[] = [];
  for (const d of ["src/motion", "src/runtime", "src/kit", "src/themes", "src/build"]) walk(join(PKG_ROOT, d), ef);
  // Hash paths relative to the project dir so a source snapshot hashes like the original.
  const project = hashFiles(pf.filter((f) => !f.endsWith(".md")), dir);
  const engine = hashFiles(ef);
  return { project, engine, combined: createHash("sha256").update(project + engine).digest("hex").slice(0, 12) };
}
