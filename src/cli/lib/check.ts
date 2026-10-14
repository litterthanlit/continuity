import { copyFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { BuildResult } from "../../build/build.js";
import type { Finding, Severity } from "../../spec/findings.js";
import { parseJsonOutput, runHf } from "./hf.js";
import { auditTimes } from "./times.js";

interface HfCheckFinding {
  code: string;
  severity: Severity;
  message: string;
  time?: number;
  selector?: string;
  fixHint?: string;
  dataAttributes?: Record<string, string>;
  bbox?: { x: number; y: number; width: number; height: number };
  heldMs?: number;
  occurrences?: number;
  text?: string;
  [k: string]: unknown;
}

interface HfSection {
  ok?: boolean;
  findings?: HfCheckFinding[];
}

interface HfCheck {
  ok: boolean;
  browserSkipped: boolean;
  runtime?: HfSection;
  layout?: HfSection;
  motion?: HfSection;
  contrast?: HfSection;
}

const PASSTHROUGH = ["ratio", "required", "fg", "bg", "suggestedColor", "text", "containerSelector", "heldMs", "occurrences"];

/**
 * HyperFrames' browser gate: runtime errors, layout (overflow, clipping,
 * overlap, occlusion), our generated motion assertions and WCAG contrast,
 * sampled at Continuity's tween boundaries plus an even sweep.
 */
export async function hfCheck(
  build: BuildResult,
  opts: { snapshots?: boolean; scene?: string; deep?: boolean } = {},
): Promise<{ findings: Finding[]; raw: unknown }> {
  // --deep: let HyperFrames verify our generated motion assertions against the seeked
  // timeline (slow — ~10s per assertion — so it is reserved for pre-delivery checks).
  const sidecar = join(build.dir, "index.motion.json");
  if (opts.deep && existsSync(join(build.dir, "motion-assertions.json"))) copyFileSync(join(build.dir, "motion-assertions.json"), sidecar);
  else rmSync(sidecar, { force: true });
  const win = opts.scene ? build.timeline!.scenes.find((s) => s.scene === opts.scene) : undefined;
  const times = auditTimes(build).filter((t) => !win || (t >= win.start && t <= win.start + win.duration));
  // Scene mode: the other scenes are placeholders — sample only this scene's window.
  const args = ["check", build.dir, "--json", "--samples", win ? "2" : "9", "--timeout", "15000"];
  if (times.length) args.push("--at", times.join(","));
  if (opts.snapshots) args.push("--snapshots");
  const r = await runHf(args, { timeoutMs: 10 * 60_000 });
  let j: HfCheck;
  try {
    j = parseJsonOutput<HfCheck>(r.stdout);
  } catch {
    return {
      findings: [{ source: "check", rule: "check-crashed", severity: "error", message: `hyperframes check produced no report:\n${(r.stdout + r.stderr).slice(-1500)}` }],
      raw: null,
    };
  }
  const findings: Finding[] = [];
  if (j.browserSkipped) {
    findings.push({ source: "check", rule: "browser-skipped", severity: "error", message: "the browser audit did not run (lint errors or launch failure) — layout/contrast results are missing, not clean" });
  }
  const sceneAt = (t?: number) => {
    if (t === undefined) return undefined;
    let id: string | undefined;
    for (const s of build.timeline!.scenes) if (t >= s.start - 1e-6) id = s.scene;
    return id;
  };
  // Scene overlaps (transitions): text from two scenes legitimately coexists there.
  const tl = build.timeline!;
  const windows = tl.scenes.slice(1).map((s, i) => [s.start, tl.scenes[i].start + tl.scenes[i].duration] as const).filter(([a, b]) => b > a);
  const inTransition = (t?: number) => t !== undefined && windows.some(([a, b]) => t >= a - 0.02 && t <= b + 0.02);
  // Mid-transition frames mix two scenes (bands, half-revealed masks): overlap and contrast there are not defects.
  const TRANSIENT = new Set(["content_overlap", "text_occluded", "occlusion", "content_occlusion", "contrast_aa_failure"]);
  for (const [section, data] of Object.entries({ runtime: j.runtime, layout: j.layout, motion: j.motion, contrast: j.contrast })) {
    for (const f of data?.findings ?? []) {
      const element = f.dataAttributes?.["data-ct"];
      const extra: Record<string, unknown> = { section };
      for (const k of PASSTHROUGH) if (f[k] !== undefined) extra[k] = f[k];
      const demote = TRANSIENT.has(f.code) && inTransition(f.time);
      findings.push({
        source: "check",
        rule: f.code,
        severity: demote ? "info" : f.severity,
        message: (demote ? "[during scene transition] " : "") + f.message + (f.text ? ` ("${String(f.text).slice(0, 40)}")` : ""),
        element,
        scene: element ? element.slice(0, element.indexOf(".")) : sceneAt(f.time),
        time: f.time,
        selector: f.selector,
        bbox: f.bbox,
        suggestion: f.fixHint ?? (f.suggestedColor ? `use ${String(f.suggestedColor)}` : undefined),
        data: extra,
      });
    }
  }
  return { findings, raw: j };
}
