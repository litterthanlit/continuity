#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit): after a project source changes, run the
// fast static gate and feed errors straight back to the agent (exit 2).
import { spawnSync } from "node:child_process";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let input = {};
try {
  input = JSON.parse(raw || "{}");
} catch {
  process.exit(0);
}
const file = input.tool_input?.file_path ?? input.tool_input?.path ?? "";
const m = /\/projects\/([^/]+)\/(storyboard\.json|scenes\/[^/]+\.tsx|lib\/.+\.tsx?|theme\.ts)$/.exec(file);
if (!m || m[1].startsWith("_defects")) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const r = spawnSync("pnpm", ["-s", "ct", "lint", m[1], "--fast"], { cwd: root, encoding: "utf8", timeout: 90_000 });
if (r.status === 0) process.exit(0);
const out = (r.stdout + r.stderr).trim().split("\n").slice(-40).join("\n");
process.stderr.write(`ct lint ${m[1]} — fix before moving on:\n${out}\n`);
process.exit(2);
