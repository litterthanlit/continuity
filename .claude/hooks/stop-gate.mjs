#!/usr/bin/env node
// Stop / SubagentStop: don't finish while a project you changed hasn't passed
// the full gate (`pnpm ct check <slug>`). Respects stop_hook_active (no loops).
import { spawnSync } from "node:child_process";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let input = {};
try {
  input = JSON.parse(raw || "{}");
} catch {
  process.exit(0);
}
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const r = spawnSync("pnpm", ["-s", "ct", "gate-status", "--json"], { cwd: root, encoding: "utf8", timeout: 60_000 });
let states = [];
try {
  states = JSON.parse(r.stdout.trim().split("\n").pop() || "[]");
} catch {
  process.exit(0);
}
const failing = states.filter((s) => !s.passing);
if (!failing.length) process.exit(0);
const lines = failing.map((s) => `- ${s.slug}: ${s.reason} → run \`pnpm ct check ${s.slug}\` and fix every error (then look: \`pnpm ct sheet ${s.slug}\`).`);
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: `Continuity definition of done not met:\n${lines.join("\n")}\nIf you are intentionally stopping mid-work, say so to the user and stop again.`,
  }),
);
process.exit(0);
