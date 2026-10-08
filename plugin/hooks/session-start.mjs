#!/usr/bin/env node
// SessionStart: in a repo that uses Continuity, make the toolchain ready and say
// what is missing. Silent everywhere else.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findCt, layout, projectRoot, runCt } from "./lib.mjs";

const root = projectRoot();
const where = layout(root);
let declared = false;
try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  declared = Boolean(pkg.dependencies?.["@litterthanlit/continuity"] || pkg.devDependencies?.["@litterthanlit/continuity"]);
} catch {
  /* no package.json */
}
if (!where && !declared) process.exit(0);

let ct = findCt(root);
// Cloud sessions start from a fresh clone: install the repo's dependencies once.
if (!ct && declared && process.env.CLAUDE_CODE_REMOTE === "true") {
  const pm = existsSync(join(root, "pnpm-lock.yaml")) ? "pnpm" : existsSync(join(root, "yarn.lock")) ? "yarn" : existsSync(join(root, "bun.lockb")) || existsSync(join(root, "bun.lock")) ? "bun" : "npm";
  const opts = { cwd: root, stdio: "ignore", timeout: 600_000, env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: "1" } };
  const args = pm === "npm" ? ["install", "--no-audit", "--no-fund"] : ["install"];
  if (spawnSync(pm, args, opts).error) spawnSync("npx", ["--yes", pm, ...args], opts); // pm not on PATH (e.g. pnpm without corepack)
  ct = findCt(root);
}

if (!ct) {
  process.stdout.write(
    "Continuity: this repo is set up for Continuity but the `ct` CLI isn't installed. Run /continuity:setup (or `npm i -D @litterthanlit/continuity && npx ct init`).\n",
  );
  process.exit(0);
}

if (process.env.CLAUDE_ENV_FILE) {
  appendFileSync(
    process.env.CLAUDE_ENV_FILE,
    ["PUPPETEER_SKIP_DOWNLOAD=1", "HYPERFRAMES_NO_TELEMETRY=1", "DO_NOT_TRACK=1", "HYPERFRAMES_NO_UPDATE_CHECK=1"].map((v) => `export ${v}\n`).join(""),
  );
}
const r = runCt(ct, ["doctor"], where?.root ?? root, 60_000);
const out = `${r.stdout ?? ""}`.trim();
process.stdout.write(`Continuity toolchain (npx ct doctor):\n${out}\n${r.status === 0 ? "" : "Fix the issues above before checking or rendering.\n"}`);
process.exit(0);
