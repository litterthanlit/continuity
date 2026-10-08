#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit): after a project source changes, run the
// fast static gate and feed errors straight back to the agent (exit 2).
import { relative, sep } from "node:path";
import { findCt, layout, readInput, runCt } from "./lib.mjs";

const input = await readInput();
const file = input.tool_input?.file_path ?? input.tool_input?.path ?? "";
const where = layout();
const ct = where && findCt(where.root);
if (!file || !where || !ct) process.exit(0);

const rel = relative(where.root, file).split(sep).join("/");
const prefix = where.projectsDir.replace(/^\.\//, "").replace(/\/$/, "");
const m = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([^/]+)/(storyboard\\.json|scenes/[^/]+\\.tsx|lib/.+\\.tsx?|theme\\.ts)$`).exec(rel);
if (!m || m[1].startsWith("_defects")) process.exit(0);

const r = runCt(ct, ["lint", m[1], "--fast"], where.root, 90_000);
if (r.status === 0) process.exit(0);
const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n");
process.stderr.write(`ct lint ${m[1]} — fix before moving on:\n${out}\n`);
process.exit(2);
