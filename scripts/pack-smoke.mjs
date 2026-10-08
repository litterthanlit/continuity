#!/usr/bin/env node
// Install the packed package into a throwaway repo and drive it like a user:
// init → new → lint → build (→ check → render with --browser). Proves the
// published tarball works outside this checkout, under npm or pnpm.
//
//   node scripts/pack-smoke.mjs [--pm npm|pnpm] [--browser] [--keep]
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const pm = args.includes("--pm") ? args[args.indexOf("--pm") + 1] : "npm";
const browser = args.includes("--browser");
const keep = args.includes("--keep");

const work = mkdtempSync(join(tmpdir(), "ct-smoke-"));
const repo = join(work, "repo");
const run = (cmd, argv, cwd = repo) => {
  console.log(`$ ${cmd} ${argv.join(" ")}`);
  return execFileSync(cmd, argv, { cwd, stdio: ["ignore", "pipe", "inherit"], encoding: "utf8", env: { ...process.env, CI: "1" } });
};
const ct = (...argv) => {
  const out = pm === "pnpm" ? run("pnpm", ["exec", "ct", ...argv]) : run("npx", ["--no-install", "ct", ...argv]);
  process.stdout.write(out.split("\n").map((l) => `  ${l}`).join("\n") + "\n");
  return out;
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(`smoke: ${msg}`);
};

try {
  run("npm", ["pack", "--pack-destination", work], ROOT);
  const tgz = join(work, readdirSync(work).find((f) => f.endsWith(".tgz")));
  execFileSync("mkdir", ["-p", repo]);
  writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "smoke", private: true }, null, 2));
  run("git", ["init", "-q"]);
  run(pm, pm === "pnpm" ? ["add", "-D", tgz] : ["install", "-D", tgz, "--no-audit", "--no-fund"]);

  const pkgDir = join(repo, "node_modules", "@litterthanlit", "continuity");
  const stamp = (d) => {
    let n = 0;
    const walk = (p) => {
      for (const e of readdirSync(p)) {
        const f = join(p, e);
        const s = statSync(f);
        if (s.isDirectory()) walk(f);
        else n += s.mtimeMs;
      }
    };
    walk(d);
    return n;
  };
  const before = stamp(pkgDir);

  ct("init");
  ct("init"); // idempotent
  for (const f of ["continuity.json", "projects/package.json", "projects/tsconfig.json", "CLAUDE.md", ".gitignore", ".claude/settings.json"]) {
    assert(existsSync(join(repo, f)), `init did not write ${f}`);
  }
  const md = readFileSync(join(repo, "CLAUDE.md"), "utf8");
  assert(md.split("continuity:begin").length === 2, "CLAUDE.md block duplicated by a second init");
  assert(readFileSync(join(repo, ".claude/settings.json"), "utf8").includes("Bash(npx ct:*)"), "permissions not merged");

  ct("new", "demo", "--aspect", "9:16");
  ct("lint", "demo");
  ct("build", "demo");
  assert(existsSync(join(repo, "build/demo/index.html")), "build/demo/index.html missing");
  if (browser) {
    ct("check", "demo");
    ct("render", "demo", "--draft");
    assert(existsSync(join(repo, "out/demo/latest-draft.mp4")), "draft render missing");
  }
  assert(stamp(pkgDir) === before, "ct wrote inside node_modules");
  console.log(`\n✔ pack smoke passed (${pm}${browser ? ", browser" : ""})${keep ? ` — kept ${repo}` : ""}`);
} finally {
  if (!keep) rmSync(work, { recursive: true, force: true });
}
