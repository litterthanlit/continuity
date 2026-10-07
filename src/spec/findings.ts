/**
 * One shape for every problem any tool reports — lint, HyperFrames check, the
 * Continuity probe, render QC, the critic. Keyed by scene + element id so a
 * builder can jump straight from a finding to the line of code to change.
 */
export type Severity = "error" | "warning" | "info";

export type FindingSource = "schema" | "build" | "lint" | "hf-lint" | "check" | "probe" | "render" | "critic";

export interface Finding {
  source: FindingSource;
  rule: string;
  severity: Severity;
  message: string;
  /** Scene id. */
  scene?: string;
  /** Full element id (`scene.element`) when known. */
  element?: string;
  /** Global seconds. */
  time?: number;
  suggestion?: string;
  selector?: string;
  bbox?: { x: number; y: number; width: number; height: number };
  data?: Record<string, unknown>;
}

export function countBySeverity(findings: Finding[]) {
  return {
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    infos: findings.filter((f) => f.severity === "info").length,
  };
}

const ICON: Record<Severity, string> = { error: "✖", warning: "▲", info: "·" };

/** Compact human-readable listing (agents read this; keep it dense and stable). */
export function formatFindings(findings: Finding[], { limit = 80 }: { limit?: number } = {}): string {
  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  const sorted = [...findings].sort(
    (a, b) => order[a.severity] - order[b.severity] || (a.time ?? 0) - (b.time ?? 0),
  );
  const lines = sorted.slice(0, limit).map((f) => {
    const where = [f.element ?? f.scene, f.time !== undefined ? `@${f.time.toFixed(2)}s` : undefined]
      .filter(Boolean)
      .join(" ");
    const fix = f.suggestion ? `\n      → ${f.suggestion}` : "";
    return `  ${ICON[f.severity]} [${f.source}:${f.rule}]${where ? " " + where : ""} — ${f.message}${fix}`;
  });
  if (sorted.length > limit) lines.push(`  … ${sorted.length - limit} more (see JSON)`);
  return lines.join("\n");
}
