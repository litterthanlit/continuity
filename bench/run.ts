/**
 * Continuity bench runner.
 *
 *   pnpm bench list                         # briefs
 *   pnpm bench run [brief…] [--model m]     # run /make-video headlessly per brief
 *   pnpm bench summary <runId>              # table of a run's results
 *   pnpm bench compare <runA> <runB>        # pairwise packs per brief
 *
 * Each brief becomes project `bench-<brief>-<runId>`; results go to
 * bench/results/<runId>.json. Runs are slow and spend model tokens — run them
 * deliberately (e.g. after a harness change), not in CI.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PKG_ROOT as ROOT, PROJECTS_DIR } from "../src/paths.js";
import { readState } from "../src/cli/lib/store.js";

const BRIEFS = join(ROOT, "bench/briefs");
const RESULTS = join(ROOT, "bench/results");

interface BriefResult {
  brief: string;
  project: string;
  ok: boolean;
  wallSeconds: number;
  costUsd?: number;
  turns?: number;
  gate?: { ok: boolean; errors: number; warnings: number };
  scores?: Record<string, number>;
  iterations: number;
  render?: string;
  error?: string;
}

const briefs = () => readdirSync(BRIEFS).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).sort();

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function runBrief(brief: string, runId: string, model?: string): BriefResult {
  const project = `bench-${brief}-${runId}`;
  const prompt =
    `/make-video ${join("bench/briefs", `${brief}.md`)} --slug ${project}\n\n` +
    `This is an unattended benchmark run: never ask the user questions — make reasonable assumptions and record them in brief.md. ` +
    `Finish with the final render and report.`;
  const args = ["-p", prompt, "--output-format", "json", "--permission-mode", "acceptEdits",
    "--allowedTools", "Bash(pnpm ct:*) Bash(pnpm -s ct:*) Read Write Edit Glob Grep Task Agent"];
  if (model) args.push("--model", model);
  const t0 = Date.now();
  const r = spawnSync("claude", args, { cwd: ROOT, encoding: "utf8", timeout: 3 * 60 * 60_000, maxBuffer: 64 * 1024 * 1024 });
  const wallSeconds = Math.round((Date.now() - t0) / 1000);
  let meta: { total_cost_usd?: number; num_turns?: number; is_error?: boolean; result?: string } = {};
  try {
    meta = JSON.parse(r.stdout);
  } catch {
    /* not JSON */
  }
  const state = existsSync(join(PROJECTS_DIR, project)) ? readState(project) : { iterations: [], verdicts: [] as unknown[] };
  const last = state.iterations[state.iterations.length - 1];
  const best = state.iterations.find((i) => i.n === (state as { best?: number }).best) ?? last;
  return {
    brief,
    project,
    ok: r.status === 0 && !meta.is_error,
    wallSeconds,
    costUsd: meta.total_cost_usd,
    turns: meta.num_turns,
    gate: best?.gate ? { ok: best.gate.ok, errors: best.gate.errors, warnings: best.gate.warnings } : undefined,
    scores: best?.scores,
    iterations: state.iterations.length,
    render: best?.render?.file,
    error: r.status === 0 ? undefined : (r.stderr || meta.result || "").slice(-2000),
  };
}

function summary(runId: string) {
  const file = join(RESULTS, `${runId}.json`);
  const results = JSON.parse(readFileSync(file, "utf8")) as BriefResult[];
  console.log(`run ${runId}`);
  console.log("brief".padEnd(22) + "gate      mean  I C Ty Te Cr  iters  time   cost");
  for (const r of results) {
    const s = r.scores ?? {};
    const gate = r.gate ? (r.gate.ok ? `✔ ${r.gate.warnings}w` : `✖ ${r.gate.errors}e`) : "—";
    console.log(
      r.brief.padEnd(22) +
        gate.padEnd(10) +
        String(s.mean ?? "—").padEnd(6) +
        ["intent", "composition", "typography", "temporal", "craft"].map((k) => String(s[k] ?? "-")).join(" ").padEnd(13) +
        String(r.iterations).padEnd(7) +
        `${r.wallSeconds}s`.padEnd(7) +
        (r.costUsd !== undefined ? `$${r.costUsd.toFixed(2)}` : ""),
    );
  }
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "list") {
    for (const b of briefs()) console.log(`${b.padEnd(22)} ${readFileSync(join(BRIEFS, `${b}.md`), "utf8").split("\n")[0].replace(/^#\s*/, "")}`);
    return;
  }
  if (cmd === "run") {
    const which = rest.filter((a, i) => !a.startsWith("--") && !(i > 0 && rest[i - 1].startsWith("--")));
    const list = which.length ? which : briefs();
    const runId = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    if (spawnSync("claude", ["--version"]).status !== 0) {
      console.error("the `claude` CLI is required for bench runs (Claude Code headless mode).");
      process.exit(1);
    }
    mkdirSync(RESULTS, { recursive: true });
    const results: BriefResult[] = [];
    for (const b of list) {
      console.log(`▶ ${b} …`);
      results.push(runBrief(b, runId, flag(rest, "model")));
      writeFileSync(join(RESULTS, `${runId}.json`), JSON.stringify(results, null, 2) + "\n");
    }
    summary(runId);
    return;
  }
  if (cmd === "summary") return summary(rest[0]);
  if (cmd === "compare") {
    const [a, b] = rest;
    const ra = JSON.parse(readFileSync(join(RESULTS, `${a}.json`), "utf8")) as BriefResult[];
    const rb = JSON.parse(readFileSync(join(RESULTS, `${b}.json`), "utf8")) as BriefResult[];
    for (const x of ra) {
      const y = rb.find((r) => r.brief === x.brief);
      if (!y) continue;
      console.log(`${x.brief}: ${x.project} vs ${y.project} — judge with the critic: compare their sheets (projects/*/.continuity/sheet.png) and renders in both orders.`);
    }
    return;
  }
  console.error(`unknown command ${cmd}`);
  process.exit(2);
}

main();
