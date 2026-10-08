import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { sourceHash } from "../../build/hash.js";
import { PROJECTS_DIR, WORK_ROOT } from "../../paths.js";
import { flagBool } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { log } from "../lib/log.js";
import { readState } from "../lib/store.js";

export interface GateState {
  slug: string;
  /** Sources changed relative to git HEAD (being worked on in this checkout). */
  dirty: boolean;
  /** The current sources have a passing full `ct check`. */
  passing: boolean;
  reason?: string;
}

/** Projects with uncommitted source changes, and whether their current sources passed the gate. */
export function gateStates(): GateState[] {
  let porcelain = "";
  let top = "";
  try {
    const git = (args: string[]) => execFileSync("git", args, { cwd: WORK_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    top = git(["rev-parse", "--show-toplevel"]).trim();
    porcelain = git(["status", "--porcelain", "-z", "--untracked-files=all", "--", PROJECTS_DIR]);
  } catch {
    return []; // not a git checkout: nothing is "being worked on"
  }
  const dirty = new Set<string>();
  // -z entries are "XY path" separated by NUL; a rename adds its source path as an extra entry.
  for (const entry of porcelain.split("\0")) {
    if (entry.length < 4) continue;
    const abs = resolve(top, entry.slice(3));
    if (!abs.startsWith(PROJECTS_DIR + sep)) continue;
    const [slug, ...rest] = relative(PROJECTS_DIR, abs).split(sep);
    const file = rest.join("/");
    if (!file || file.startsWith(".continuity/") || file.endsWith(".md")) continue;
    if (slug.startsWith("_defects") || slug === "_template") continue; // fixtures that are meant to fail / templates
    dirty.add(slug);
  }
  const out: GateState[] = [];
  for (const slug of [...dirty].sort()) {
    if (!existsSync(`${PROJECTS_DIR}/${slug}/storyboard.json`)) continue;
    const scenesDir = `${PROJECTS_DIR}/${slug}/scenes`;
    if (!existsSync(scenesDir) || readdirSync(scenesDir).length === 0) {
      out.push({ slug, dirty: true, passing: true, reason: "storyboard only — no scenes yet" });
      continue;
    }
    const { combined } = sourceHash(slug);
    const it = readState(slug).iterations.find((i) => i.hash === combined);
    const passing = Boolean(it?.gate?.ok);
    out.push({
      slug,
      dirty: true,
      passing,
      reason: passing ? undefined : it?.gate ? `gate failed (${it.gate.errors} errors)` : "sources changed since the last `ct check`",
    });
  }
  return out;
}

export const gateStatus: Command = {
  name: "gate-status",
  summary: "Which projects have uncommitted changes that have not passed the gate (used by the Stop hook).",
  usage: "ct gate-status [--json]",
  async run(a) {
    const states = gateStates();
    if (flagBool(a, "json")) log(JSON.stringify(states));
    else if (!states.length) log("no projects with uncommitted changes");
    else for (const s of states) log(`${s.passing ? "✔" : "✖"} ${s.slug}${s.reason ? ` — ${s.reason}` : ""}`);
    return states.every((s) => s.passing) ? 0 : 1;
  },
};
