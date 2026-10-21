import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { Finding } from "../spec/findings.js";

/**
 * Static scan of a project's source files: anything that would make frames
 * depend on wall-clock time or chance (frames are *seeked*: a render must be a
 * pure function of t), and the litt rules a class list can break
 * (docs/decisions/0006). A deliberate exception names the rule on its line or
 * the line above — `litt-allow: litt-radius (the device bezel)` — with a reason.
 */
export const SOURCE_RULES: Record<string, string> = {
  "nondeterministic-api":
    "Wall-clock / random APIs (Math.random, Date.now, new Date(), performance.now, setTimeout/setInterval, requestAnimationFrame) in project code — frames are seeked, so results must be a pure function of time. Use the motion DSL; for variety use fixed data or a seeded sequence.",
  "css-animation":
    "CSS animation/transition (style `animation:`/`transition:` or Tailwind `animate-*`/`transition*` classes) — real-time CSS motion is invisible to seeking and drifts between workers. Animate with `motion: (m) => …` instead.",
  "litt-weight":
    "A weight outside litt's three roles (P9) — text is 400 (font-normal, the default), titles 500 (font-title, Headline and Title), labels 600 (font-label, Label). No medium, semibold, bold or light.",
  "litt-case": "Uppercase text — litt sets every label in sentence case. Use Label (600, the grey), never an uppercase eyebrow.",
  "litt-gradient":
    "A decorative gradient (gradient text, a gradient fill or border) — litt's only gradient is the top light (Stage bg=\"lit\"). Use a flat token colour.",
  "litt-radius":
    "A radius off litt's scale — rounded-control (8) for controls and tags, rounded-surface (16) for cards and panels, rounded-full for avatars, icon buttons and switches. Nothing else.",
  "litt-shadow":
    "An ad-hoc or offset shadow (P4) — use the depth tokens: shadow-raised (cards), shadow-float / shadow-modal / shadow-tooltip (floating), shadow-glow (the one primary action), shadow-hairline / shadow-control / shadow-field / shadow-lift / shadow-focus.",
  "litt-accent-text":
    "Accent-coloured text — litt never picks out a headline word in the accent. Rank by ink: the key word in text-fg, the rest in text-fg-muted (or m.emphasize(id, \"ink\")).",
  "litt-hex": "A hard-coded colour — every colour is a litt token (bg-canvas, text-fg-muted, border-line, data hues…), so both themes stay designed.",
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

const RADIUS_OK = new Set(["control", "surface", "full", "none"]);
const SHADOW_OK = new Set(["raised", "float", "modal", "tooltip", "glow", "lift", "hairline", "control", "field", "focus", "none"]);
const WEIGHT_BAD = /^font-(thin|extralight|light|medium|semibold|bold|extrabold|black|\[\d+\])$/;

/** litt rule a single class token breaks, if any. */
function tokenRule(raw: string): string | undefined {
  const t = raw.replace(/^(?:[a-z0-9-]+:)+/, "");
  if (WEIGHT_BAD.test(t)) return "litt-weight";
  if (t === "uppercase") return "litt-case";
  if (/^(bg-(gradient|linear|radial|conic)-|from-|via-|bg-clip-text$)/.test(t)) return "litt-gradient";
  const rd = /^rounded(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?(?:-(.+))?$/.exec(t);
  if (rd && !RADIUS_OK.has(rd[1] ?? "")) return "litt-radius";
  const sh = /^(?:drop-)?shadow(?:-(.+))?$/.exec(t);
  if (sh && (t.startsWith("drop-") || !SHADOW_OK.has(sh[1] ?? ""))) return "litt-shadow";
  if (t === "text-accent") return "litt-accent-text";
  if (/^[a-z-]+-\[#[0-9a-fA-F]{3,8}\]$/.test(t)) return "litt-hex";
  return undefined;
}

const STRING_RE = /"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g;
const STYLE_CHECKS: Array<{ rule: string; re: RegExp; what: string }> = [
  { rule: "litt-case", re: /text-transform\s*:\s*["'`]?uppercase|textTransform\s*:\s*["'`]uppercase/, what: "text-transform: uppercase" },
  { rule: "litt-gradient", re: /(?:linear|conic)-gradient\(|background-clip\s*:\s*text|backgroundClip\s*:\s*["'`]text/, what: "a gradient in a style" },
  { rule: "litt-hex", re: /:\s*["'`]?#[0-9a-fA-F]{3,8}\b/, what: "a hex colour in a style" },
  { rule: "litt-weight", re: /font-?[wW]eight\s*:\s*["'`]?(?!400|500|600)\d{3}/, what: "a font-weight outside 400/500/600" },
];

/** Rules allowed on line i: `litt-allow: rule[, rule]` on the line or the one above. */
function allowedOn(raw: string[], i: number): Set<string> {
  const out = new Set<string>();
  for (const l of [raw[i - 1] ?? "", raw[i]]) {
    const m = /litt-allow:\s*([\w\-, ]+)/.exec(l);
    if (m) for (const r of m[1].split(/[\s,]+/)) if (r) out.add(r);
  }
  return out;
}

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
    const text = readFileSync(file, "utf8");
    const raw = text.split("\n");
    const lines = stripComments(text).split("\n");
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
      if (!/\.(tsx?|jsx?|mjs)$/.test(file)) return;
      const allow = allowedOn(raw, i);
      const hits = new Map<string, string>();
      for (const m of line.matchAll(STRING_RE)) {
        for (const tok of (m[1] ?? m[2] ?? m[3] ?? "").split(/\s+/)) {
          const rule = tok && tokenRule(tok);
          if (rule && !hits.has(rule)) hits.set(rule, `class "${tok}"`);
        }
      }
      for (const c of STYLE_CHECKS) if (!hits.has(c.rule) && c.re.test(line)) hits.set(c.rule, c.what);
      for (const [rule, what] of hits) {
        if (allow.has(rule)) continue;
        findings.push({ source: "lint", rule, severity: "warning", scene, message: `${where}:${i + 1} uses ${what}`, suggestion: SOURCE_RULES[rule].split(" — ")[1] });
      }
    });
  }
  return findings;
}
