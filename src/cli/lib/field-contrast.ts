import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "puppeteer-core";
import type { BuildResult } from "../../build/build.js";
import { resolveScene } from "../../motion/evaluate.js";
import { depDir } from "../../paths.js";
import type { Finding } from "../../spec/findings.js";

/**
 * Contrast over a moving field (docs/decisions/0011). HyperFrames' check audits contrast on five
 * frames for the whole film, so a field scene gets one sample or none, and the colour behind its
 * type changes every frame. This pass runs HyperFrames' own browser audit (the same script, the
 * same WCAG maths and "held" rule) on the times `fieldTimes` gives: every half second through each
 * scene whose stage paints a field. It judges landed type: a text mid-entrance or mid-exit (its own
 * tween or an ancestor's) is half-transparent over the field at that instant, and is judged at the
 * next sample instead.
 */

interface Candidate {
  selector: string;
  text: string;
  ct: string | null;
  bbox: { x: number; y: number; w: number; h: number };
}

interface Entry {
  time: number;
  /** The candidate's index, passed through the audit as its selector. */
  selector: string;
  text: string;
  ratio: number;
  wcagAA: boolean;
  large: boolean;
  fg: string;
  bg: string;
}

let script: string | undefined;
function auditScript(): string {
  script ??= readFileSync(join(depDir("hyperframes"), "dist", "commands", "contrast-audit.browser.js"), "utf8");
  return script;
}

/** Hide each text's paint and list it, tagged with its `data-ct` id (the audit pushes one restore per candidate, in order). */
const PREPARE = `(function () {
  var cands = window.__contrastAuditPrepare();
  var restores = window.__contrastAuditRestores || [];
  return cands.map(function (c, i) {
    var holder = restores[i] && restores[i].el.closest("[data-ct]");
    return { selector: c.selector, text: c.text, ct: holder ? holder.getAttribute("data-ct") : null, bbox: c.bbox, fg: c.fg, stroke: c.stroke, fontSize: c.fontSize, fontWeight: c.fontWeight, large: c.large };
  });
})()`;

/** Elements entering or leaving at global time `t` (any part of a split tween in flight). */
function inFlight(build: BuildResult, t: number): Set<string> {
  const out = new Set<string>();
  for (const sc of build.timeline!.scenes) {
    if (t < sc.start || t > sc.start + sc.duration) continue;
    for (const r of resolveScene(sc, build.partsEstimate)) {
      if (r.kind !== "enter" && r.kind !== "exit") continue;
      if (t >= sc.start + r.start && t <= sc.start + r.start + r.duration) out.add(r.target);
    }
  }
  return out;
}

export async function fieldContrast(page: Page, build: BuildResult, times: number[]): Promise<Finding[]> {
  if (!times.length) return [];
  const ancestors = new Map(build.elements.map((e) => [e.id, e.ancestors]));
  const landed = (ct: string | null, moving: Set<string>) => !ct || (!moving.has(ct) && !(ancestors.get(ct) ?? []).some((a) => moving.has(a)));
  await page.addScriptTag({ content: auditScript() });
  const entries: Array<Entry & { cand: Candidate }> = [];
  for (const t of times) {
    await page.evaluate((time: number) => (window as unknown as { __ct: { seek: (t: number) => void } }).__ct.seek(time), t);
    try {
      const cands = (await page.evaluate(PREPARE)) as Array<Candidate & Record<string, unknown>>;
      const shot = await page.screenshot({ encoding: "base64", type: "png", omitBackground: true });
      const tagged = cands.map((c, i) => ({ ...c, selector: String(i) }));
      const got = (await page.evaluate(
        (b64: string, time: number, c: unknown[]) => (window as unknown as { __contrastAuditFinish: (b: string, t: number, c: unknown[]) => Promise<Entry[]> }).__contrastAuditFinish(b64, time, c),
        shot,
        t,
        tagged,
      )) as Entry[];
      const moving = inFlight(build, t);
      for (const e of got) {
        const cand = cands[Number(e.selector)]!;
        if (landed(cand.ct, moving)) entries.push({ ...e, cand });
      }
    } finally {
      await page.evaluate("window.__contrastAuditRestoreIfPending && window.__contrastAuditRestoreIfPending()");
    }
  }
  return contrastFindings(build, entries);
}

/** One finding per text: its worst sample, an error once it fails at two sample times (HyperFrames' "held"). */
function contrastFindings(build: BuildResult, entries: Array<Entry & { cand: Candidate }>): Finding[] {
  const byText = new Map<string, Array<Entry & { cand: Candidate }>>();
  for (const e of entries) {
    if (e.wcagAA) continue;
    const key = `${e.cand.ct ?? e.cand.selector}|${e.text}`;
    byText.set(key, [...(byText.get(key) ?? []), e]);
  }
  const sceneAt = (t: number) => {
    let id: string | undefined;
    for (const s of build.timeline!.scenes) if (t >= s.start - 1e-6) id = s.scene;
    return id;
  };
  const findings: Finding[] = [];
  for (const fails of byText.values()) {
    const worst = fails.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    const required = worst.large ? 3 : 4.5;
    const at = [...new Set(fails.map((f) => f.time))];
    const element = worst.cand.ct ?? undefined;
    findings.push({
      source: "check",
      rule: "contrast_aa_failure",
      severity: at.length >= 2 ? "error" : "warning",
      message: `Contrast is ${worst.ratio}:1 over the moving field; WCAG AA requires ${required}:1 (fails at ${at.length} of the field's sample times) ("${worst.text.slice(0, 40)}")`,
      element,
      scene: element ? element.slice(0, element.indexOf(".")) : sceneAt(worst.time),
      time: worst.time,
      selector: worst.cand.selector,
      bbox: { x: worst.cand.bbox.x, y: worst.cand.bbox.y, width: worst.cand.bbox.w, height: worst.cand.bbox.h },
      suggestion: "over a field, set the type in fg (the greys fail on its brighter colours) and rank by size and weight; or move it onto glass, or the scene to bg=\"solid\"",
      data: { section: "contrast", pass: "field", ratio: worst.ratio, required, fg: worst.fg, bg: worst.bg, failedAt: at },
    });
  }
  return findings;
}
