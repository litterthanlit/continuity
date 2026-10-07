import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sourceHash } from "../../build/hash.js";
import { projectDir, stateDir } from "../../paths.js";
import type { Finding } from "../../spec/findings.js";

/**
 * Iteration store. Every distinct version of a project's sources (storyboard,
 * scenes, theme, assets + engine) is an iteration with its own evidence folder.
 * Agents compare iterations, keep the best one, and can revert to it.
 */
export interface IterationRecord {
  n: number;
  hash: string;
  createdAt: string;
  gate?: { ok: boolean; errors: number; warnings: number; at: string };
  render?: { file: string; draft: boolean; at: string };
  scores?: Record<string, number>;
  note?: string;
}

export interface ProjectState {
  iterations: IterationRecord[];
  best?: number;
  verdicts: Array<{ a: number; b: number; winner: number; reason: string; at: string }>;
}

const pad = (n: number) => String(n).padStart(3, "0");

export function statePath(slug: string) {
  return join(stateDir(slug), "state.json");
}

export function readState(slug: string): ProjectState {
  const p = statePath(slug);
  if (!existsSync(p)) return { iterations: [], verdicts: [] };
  const s = JSON.parse(readFileSync(p, "utf8")) as ProjectState;
  s.verdicts ??= [];
  return s;
}

export function writeState(slug: string, s: ProjectState) {
  mkdirSync(stateDir(slug), { recursive: true });
  writeFileSync(statePath(slug), JSON.stringify(s, null, 2) + "\n");
}

export function iterationDir(slug: string, n: number) {
  return join(stateDir(slug), "iterations", pad(n));
}

const SNAPSHOT = ["storyboard.json", "scenes", "lib", "theme.ts", "assets"];

/** The iteration matching the project's current sources (created on first use). */
export function currentIteration(slug: string): { n: number; dir: string; record: IterationRecord; isNew: boolean } {
  const state = readState(slug);
  const { combined } = sourceHash(slug);
  const last = state.iterations[state.iterations.length - 1];
  if (last && last.hash === combined) {
    return { n: last.n, dir: iterationDir(slug, last.n), record: last, isNew: false };
  }
  const n = (last?.n ?? 0) + 1;
  const dir = iterationDir(slug, n);
  mkdirSync(join(dir, "src"), { recursive: true });
  for (const name of SNAPSHOT) {
    const from = join(projectDir(slug), name);
    if (existsSync(from)) cpSync(from, join(dir, "src", name), { recursive: true });
  }
  const record: IterationRecord = { n, hash: combined, createdAt: new Date().toISOString() };
  state.iterations.push(record);
  writeState(slug, state);
  return { n, dir, record, isNew: true };
}

export function updateIteration(slug: string, n: number, patch: Partial<IterationRecord>) {
  const state = readState(slug);
  const rec = state.iterations.find((i) => i.n === n);
  if (!rec) throw new Error(`iteration ${n} not found`);
  Object.assign(rec, patch);
  writeState(slug, state);
}

export function writeFindings(dir: string, name: string, findings: Finding[]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), JSON.stringify(findings, null, 2) + "\n");
}

export function readFindings(dir: string, name: string): Finding[] {
  const p = join(dir, name);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Finding[]) : [];
}

/** Restore a previous iteration's sources into the project (for "keep the best"). */
export function restoreIteration(slug: string, n: number) {
  const src = join(iterationDir(slug, n), "src");
  if (!existsSync(src)) throw new Error(`iteration ${n} has no source snapshot`);
  for (const name of SNAPSHOT) {
    const to = join(projectDir(slug), name);
    const from = join(src, name);
    if (existsSync(to)) rmSync(to, { recursive: true, force: true });
    if (existsSync(from)) cpSync(from, to, { recursive: true });
  }
}
