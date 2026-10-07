import { join } from "node:path";
import { buildProject } from "../../build/build.js";
import { rel } from "../../paths.js";
import { flagBool, flagNums, flagStr, requireSlug } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { captureFrames } from "../lib/frames.js";
import { fail, log, ok, step } from "../lib/log.js";
import { report } from "../lib/project.js";
import { currentIteration } from "../lib/store.js";
import { beatTimes, fmtTime, keyTimes, type TimePoint } from "../lib/times.js";

export const stills: Command = {
  name: "stills",
  summary: "Full-resolution frames for close reading (typography, legibility, detail). Default: one settled frame per scene.",
  usage:
    "ct stills <project> [--at 1.2,3.4] [--beats] [--scene <id>]\n" +
    "  default   one settled 'hero' frame per scene\n" +
    "  --beats   a frame just after every storyboard beat\n" +
    "  --at      exact global times (seconds)",
  async run(a) {
    const slug = requireSlug(a);
    const b = await buildProject(slug);
    if (!b.ok || !b.timeline) {
      report("build", b.findings);
      fail("fix build errors first (ct lint)");
      return 1;
    }
    const scene = flagStr(a, "scene");
    let points: TimePoint[];
    const at = flagNums(a, "at");
    if (at) points = at.map((t) => ({ t, scene: "", label: "" }));
    else if (flagBool(a, "beats")) points = beatTimes(b);
    else points = keyTimes(b);
    if (scene) points = points.filter((p) => !p.scene || p.scene === scene);
    if (!points.length) {
      fail("no frames selected");
      return 1;
    }
    const it = currentIteration(slug);
    const dir = join(it.dir, "stills");
    step(`capturing ${points.length} frame(s) → iteration ${it.n}`);
    const frames = await captureFrames(slug, points.map((p) => p.t), dir);
    for (const f of frames) {
      const p = points.find((x) => Math.abs(x.t - f.t) < 0.002);
      log(`  ${fmtTime(f.t)}  ${(p?.scene ?? "").padEnd(14)} ${(p?.label ?? "").padEnd(8)} ${rel(f.file)}`);
    }
    ok(`${frames.length} still(s). Read them at full size to judge type, spacing and detail.`);
    return 0;
  },
};
