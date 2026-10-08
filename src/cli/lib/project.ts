import { buildProject, type BuildResult } from "../../build/build.js";
import { lintSources } from "../../lint/source.js";
import { lintTimeline } from "../../lint/timeline.js";
import { buildDir, projectDir, rel } from "../../paths.js";
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

export async function hfLint(dir: string): Promise<Finding[]> {
  const r = await runHf(["lint", dir, "--json"]);
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

/** Build the whole project, or one scene in isolation (others become placeholders) into its own dir. */
export function buildFor(slug: string, scene?: string) {
  return buildProject(slug, scene ? { only: scene, outDir: buildDir(`${slug}~${scene}`) } : {});
}

export interface LintResult {
  build: BuildResult;
  findings: Finding[];
}

/** Build + static checks (schema, build, timeline lint, HyperFrames lint). Fast, no browser. */
export async function buildAndLint(slug: string, opts: { hf?: boolean; scene?: string } = {}): Promise<LintResult> {
  const build = await buildFor(slug, opts.scene);
  let findings = [...build.findings];
  if (build.timeline) findings.push(...lintTimeline(build));
  findings.push(...lintSources(projectDir(slug)));
  if (build.ok && opts.hf !== false) findings.push(...(await hfLint(build.dir)));
  // Scene mode: other scenes are placeholders, so only this scene's findings mean anything.
  if (opts.scene) findings = findings.filter((f) => !f.scene || f.scene === opts.scene || f.source === "schema");
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
