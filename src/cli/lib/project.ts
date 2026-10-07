import { buildProject, type BuildResult } from "../../build/build.js";
import { lintTimeline } from "../../lint/timeline.js";
import { buildDir, rel } from "../../paths.js";
import { countBySeverity, formatFindings, type Finding } from "../../spec/findings.js";
import { parseJsonOutput, runHf } from "./hf.js";
import { color, fail, log, ok } from "./log.js";

/** HyperFrames lint codes that are expected given Continuity's single-file composition design. */
const HF_LINT_IGNORE = new Set(["nested_structure_needs_subcomposition"]);

interface HfLintFinding {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  fixHint?: string;
  elementId?: string;
  selector?: string;
}

export async function hfLint(slug: string): Promise<Finding[]> {
  const r = await runHf(["lint", buildDir(slug), "--json"]);
  const j = parseJsonOutput<{ findings: HfLintFinding[] }>(r.stdout);
  return j.findings
    .filter((f) => !HF_LINT_IGNORE.has(f.code))
    .map((f) => ({
      source: "hf-lint" as const,
      rule: f.code,
      severity: f.severity,
      message: f.message,
      suggestion: f.fixHint,
      selector: f.selector,
    }));
}

export interface LintResult {
  build: BuildResult;
  findings: Finding[];
}

/** Build + static checks (schema, build, timeline lint, HyperFrames lint). Fast, no browser. */
export async function buildAndLint(slug: string, opts: { hf?: boolean } = {}): Promise<LintResult> {
  const build = await buildProject(slug);
  const findings = [...build.findings];
  if (build.timeline) findings.push(...lintTimeline(build));
  if (build.ok && opts.hf !== false) findings.push(...(await hfLint(slug)));
  return { build, findings };
}

export function report(title: string, findings: Finding[], opts: { json?: boolean; quietOk?: boolean } = {}): boolean {
  const c = countBySeverity(findings);
  if (opts.json) {
    log(JSON.stringify({ ok: c.errors === 0, ...c, findings }, null, 2));
    return c.errors === 0;
  }
  const visible = findings.filter((f) => f.severity !== "info" || findings.length < 30);
  if (visible.length) log(formatFindings(visible));
  const summary = `${title}: ${c.errors} error(s), ${c.warnings} warning(s), ${c.infos} info`;
  if (c.errors) fail(summary);
  else if (!opts.quietOk || c.warnings) ok(c.warnings ? color.yellow(summary) : summary);
  return c.errors === 0;
}

export function buildSummary(b: BuildResult): string {
  if (!b.timeline || !b.storyboard) return rel(b.dir);
  return `${rel(b.dir)} · ${b.storyboard.format.aspect} ${b.timeline.width}×${b.timeline.height} @${b.timeline.fps}fps · ${b.timeline.duration}s · ${b.timeline.scenes.length} scenes · hash ${b.hash}`;
}
