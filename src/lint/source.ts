import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { Finding } from "../spec/findings.js";

/**
 * Static scan of a project's source files for anything that would make frames
 * depend on wall-clock time or chance. Frames are *seeked*: a render must be a
 * pure function of t, or two renders (or two workers) disagree.
 */
export const SOURCE_RULES: Record<string, string> = {
  "nondeterministic-api":
    "Wall-clock / random APIs (Math.random, Date.now, new Date(), performance.now, setTimeout/setInterval, requestAnimationFrame) in project code — frames are seeked, so results must be a pure function of time. Use the motion DSL; for variety use fixed data or a seeded sequence.",
  "css-animation":
    "CSS animation/transition (style `animation:`/`transition:` or Tailwind `animate-*`/`transition*` classes) — real-time CSS motion is invisible to seeking and drifts between workers. Animate with `motion: (m) => …` instead.",
};

const API = [
  { re: /\bMath\.random\s*\(/, what: "Math.random()" },
  { re: /\bDate\.now\s*\(/, what: "Date.now()" },
  { re: /\bnew\s+Date\s*\(\s*\)/, what: "new Date()" },
  { re: /\bperformance\.now\s*\(/, what: "performance.now()" },
  { re: /\bset(?:Timeout|Interval)\s*\(/, what: "setTimeout/setInterval" },
  { re: /\brequestAnimationFrame\s*\(/, what: "requestAnimationFrame" },
];
const CSS = [
  { re: /\b(?:animation|transition)(?:-[a-z]+)?\s*:\s*["'`]/, what: "inline CSS animation/transition" },
  { re: /["'`][^"'`\n]*\b(?:animation|transition)\s*:[^"'`\n]*["'`]/, what: "CSS animation/transition in a style string" },
  { re: /\bclass(?:Name)?=\{?\s*["'`](?:[^"'`]*\s)?(?:animate-[a-z0-9-]+|transition(?:-[a-z]+)?)(?=[\s"'`])/, what: "Tailwind animate-*/transition class" },
];

/** Blank out comments, keeping line numbers (a `//` inside a string such as a URL is left alone). */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (_, pre: string) => pre);
}

function walk(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir).sort()) {
    if (name === ".continuity" || name === "node_modules" || name === "assets") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|mjs|css)$/.test(name)) out.push(p);
  }
}

export function lintSources(projectDir: string): Finding[] {
  const files: string[] = [];
  walk(projectDir, files);
  const findings: Finding[] = [];
  for (const file of files) {
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    const where = relative(projectDir, file);
    const scene = where.startsWith("scenes/") ? basename(file).replace(/\.[^.]+$/, "") : undefined;
    lines.forEach((line, i) => {
      for (const [rule, checks] of [["nondeterministic-api", API], ["css-animation", CSS]] as const) {
        const hit = checks.find((c) => c.re.test(line));
        if (!hit) continue;
        findings.push({
          source: "lint",
          rule,
          severity: "error",
          scene,
          message: `${where}:${i + 1} uses ${hit.what}`,
          suggestion: SOURCE_RULES[rule].split(" — ")[1],
        });
      }
    });
  }
  return findings;
}
