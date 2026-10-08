#!/usr/bin/env node
// Stop: don't finish while a project you changed hasn't passed the full gate
// (`npx ct check <slug>`). Respects stop_hook_active (no loops); fails open.
import { findCt, layout, readInput, runCt } from "./lib.mjs";

const input = await readInput();
if (input.stop_hook_active) process.exit(0);
const where = layout();
const ct = where && findCt(where.root);
if (!where || !ct) process.exit(0);

const r = runCt(ct, ["gate-status", "--json"], where.root, 60_000);
let states = [];
try {
  states = JSON.parse((r.stdout ?? "").trim().split("\n").pop() || "[]");
} catch {
  process.exit(0);
}
const failing = states.filter((s) => !s.passing);
if (!failing.length) process.exit(0);
const lines = failing.map((s) => `- ${s.slug}: ${s.reason} → run \`npx ct check ${s.slug}\` and fix every error (then look: \`npx ct sheet ${s.slug}\`).`);
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: `Continuity definition of done not met:\n${lines.join("\n")}\nIf you are intentionally stopping mid-work, say so to the user and stop again.`,
  }),
);
process.exit(0);
