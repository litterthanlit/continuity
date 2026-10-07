import { buildProject } from "../../build/build.js";
import { resolveScene } from "../../motion/evaluate.js";
import { flagBool, flagStr, requireSlug } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { fail, log } from "../lib/log.js";
import { report } from "../lib/project.js";
import { fmtTime } from "../lib/times.js";

const r2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export const timeline: Command = {
  name: "timeline",
  summary: "Print the resolved motion timeline (every tween with start/end/ease) — reason about rhythm with numbers.",
  usage: "ct timeline <project> [--scene <id>] [--json]",
  async run(a) {
    const slug = requireSlug(a);
    const b = await buildProject(slug, { write: false });
    if (!b.timeline) {
      report("build", b.findings);
      fail("no timeline");
      return 1;
    }
    if (flagBool(a, "json")) {
      log(JSON.stringify(b.timeline, null, 2));
      return 0;
    }
    const only = flagStr(a, "scene");
    log(`${b.storyboard!.title} — ${b.timeline.duration}s @${b.timeline.fps}fps, ${b.timeline.width}×${b.timeline.height}`);
    for (const sc of b.timeline.scenes) {
      if (only && sc.scene !== only) continue;
      log(`\n■ ${sc.scene}  ${fmtTime(sc.start)} → ${fmtTime(sc.start + sc.duration)}  (${sc.duration}s)`);
      const beats = Object.entries(sc.beats);
      if (beats.length) log(`  beats: ${beats.map(([k, v]) => `${k}@${v}`).join("  ")}`);
      const resolved = resolveScene(sc, b.partsEstimate);
      const spanEnd = new Map<number, number>();
      for (const r of resolved) spanEnd.set(r.source, Math.max(spanEnd.get(r.source) ?? 0, r.start + r.duration));
      sc.tweens
        .map((t, i) => ({ t, i }))
        .sort((x, y) => x.t.start - y.t.start)
        .forEach(({ t, i }) => {
          const local = t.target.slice(t.target.indexOf(".") + 1);
          const what = t.preset ?? Object.keys(t.props).join("+");
          const split = t.split ? ` ${t.split}/${t.stagger?.name ?? t.stagger?.each}` : "";
          const end = spanEnd.get(i) ?? t.start + t.duration;
          log(`  ${r2(t.start).padStart(6)}–${r2(end).padEnd(6)} ${t.kind.padEnd(10)} ${local.padEnd(18)} ${what}${split}  ease:${t.easeName ?? t.ease.type}`);
        });
      for (const l of sc.loops) {
        log(`  ${r2(l.start).padStart(6)}–${(l.end === null ? "end" : r2(l.end)).padEnd(6)} loop       ${l.target.slice(l.target.indexOf(".") + 1).padEnd(18)} ${l.prop} ±${l.amplitude} / ${l.period}s`);
      }
    }
    return 0;
  },
};
