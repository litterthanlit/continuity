import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildProject } from "../../build/build.js";
import { stateDir, rel } from "../../paths.js";
import { countBySeverity } from "../../spec/findings.js";
import { requireSlug } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { log, ok } from "../lib/log.js";
import { iterationDir, readFindings, readState } from "../lib/store.js";
import { fmtTime } from "../lib/times.js";
import { emitResult } from "../lib/result.js";
import { AXES } from "./iterate.js";

export const reportCmd: Command = {
  name: "report",
  summary: "Write .continuity/report.md (+ poster.png, sheet.png) summarising the project, best iteration, scores and known issues.",
  usage: "ct report <project>",
  async run(a) {
    const slug = requireSlug(a);
    const b = await buildProject(slug, { write: false });
    const s = readState(slug);
    const last = s.iterations[s.iterations.length - 1];
    const pick = s.best ?? last?.n;
    const it = s.iterations.find((i) => i.n === pick);
    const lines: string[] = [];
    const sb = b.storyboard;
    lines.push(`# ${sb?.title ?? slug}`, "");
    if (sb?.logline) lines.push(`> ${sb.logline}`, "");
    if (b.timeline && sb) {
      lines.push(`**Format:** ${sb.format.aspect} · ${b.timeline.width}×${b.timeline.height} · ${b.timeline.fps}fps · ${b.timeline.duration}s · theme \`${sb.theme}\``, "");
      lines.push("| # | Scene | In | Duration | Intent | Transition out |", "|---|---|---|---|---|---|");
      sb.scenes.forEach((sc, i) => {
        const t = b.timeline!.scenes[i];
        lines.push(`| ${i + 1} | \`${sc.id}\` | ${fmtTime(t.start)} | ${sc.duration}s | ${sc.intent} | ${sc.transition?.type ?? "cut"} |`);
      });
      lines.push("");
    }
    if (it) {
      const dir = iterationDir(slug, it.n);
      lines.push(`## Iteration #${it.n}${s.best === it.n ? " (best)" : ""}`, "");
      if (it.gate) lines.push(`- Gate: ${it.gate.ok ? "✅ pass" : "❌ fail"} — ${it.gate.errors} errors, ${it.gate.warnings} warnings`);
      if (it.scores) lines.push(`- Critique: ${AXES.map((k) => `${k} ${it.scores![k]}`).join(" · ")} (mean ${it.scores.mean})`);
      if (it.render) lines.push(`- Render: \`${it.render.file}\`${it.render.draft ? " (draft)" : ""}`);
      if (it.note) lines.push(`- Note: ${it.note}`);
      lines.push("");
      const findings = readFindings(dir, "findings.json").filter((f) => f.severity !== "info");
      const c = countBySeverity(findings);
      if (findings.length) {
        lines.push(`### Known issues (${c.errors} errors, ${c.warnings} warnings)`, "");
        for (const f of findings.slice(0, 20)) lines.push(`- **${f.rule}** ${f.element ?? f.scene ?? ""}${f.time !== undefined ? ` @${fmtTime(f.time)}` : ""} — ${f.message}`);
        lines.push("");
      }
      const stills = join(dir, "stills");
      if (existsSync(stills)) {
        const files = readdirSync(stills).filter((f) => f.endsWith(".png")).sort();
        if (files.length) copyFileSync(join(stills, files[0]), join(stateDir(slug), "poster.png"));
      }
      const sheets = existsSync(dir) ? readdirSync(dir).filter((f) => /^sheet(-1)?\.png$/.test(f)) : [];
      if (sheets.length) copyFileSync(join(dir, sheets[0]), join(stateDir(slug), "sheet.png"));
      if (existsSync(join(stateDir(slug), "sheet.png"))) lines.push("![contact sheet](sheet.png)", "");
      if (existsSync(join(dir, "critique.md"))) lines.push("### Critique", "", readFileSafe(join(dir, "critique.md")), "");
    }
    if (s.verdicts.length) {
      lines.push("## History", "");
      for (const v of s.verdicts) lines.push(`- #${v.a} vs #${v.b} → **#${v.winner}** — ${v.reason}`);
      lines.push("");
    }
    const out = join(stateDir(slug), "report.md");
    writeFileSync(out, lines.join("\n"));
    emitResult({ file: out, iteration: it?.n ?? null, markdown: lines.join("\n") });
    ok(`wrote ${rel(out)}`);
    log(lines.slice(0, 6).join("\n"));
    return 0;
  },
};

function readFileSafe(p: string): string {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}
