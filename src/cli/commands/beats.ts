import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildProject } from "../../build/build.js";
import { nearest } from "../../audio/grid.js";
import { rel } from "../../paths.js";
import { formatFindings } from "../../spec/findings.js";
import { lintTimeline } from "../../lint/timeline.js";
import { requireSlug } from "../lib/args.js";
import { beatsHtml, motionOnGrid } from "../lib/beats.js";
import { screenshotHtml } from "../lib/browser.js";
import type { Command } from "../lib/command.js";
import { fail, log, ok } from "../lib/log.js";
import { emitResult } from "../lib/result.js";
import { currentIteration } from "../lib/store.js";

export const beats: Command = {
  name: "beats",
  summary: "The music's grid (bpm, beats, bars, hits) against the edit: where each cut and each move lands, as a chart.",
  usage: "ct beats <project>   (needs `music` in the storyboard)",
  async run(a) {
    const slug = requireSlug(a);
    const b = await buildProject(slug, { write: false });
    if (!b.storyboard) {
      log(formatFindings(b.findings));
      fail("fix the storyboard first (ct lint --storyboard)");
      return 1;
    }
    if (!b.music || !b.timeline) {
      fail(b.music ? "fix build errors first (ct lint)" : 'no music: add "music": { "src": "assets/…wav" } to the storyboard');
      return 1;
    }
    const g = b.music.grid;
    const tl = b.timeline;
    const frame = 1 / tl.fps;
    log(`${b.music.spec.src} · ${g.bpm} bpm · ${g.beatsPerBar}/4 · ${g.beats.length} beats · ${g.bars.length} bars · ${g.hits.length} hits · plays ${g.span[0]}–${g.span[1]}s`);
    const cuts = tl.scenes.map((s, i) => {
      const p = nearest(g.beats, s.start);
      const off = p === undefined ? null : Math.round((s.start - p) * 1000) / 1000;
      const span = b.storyboard!.scenes[i].span;
      log(`  ${s.scene.padEnd(14)} ${s.start.toFixed(3).padStart(7)}s  ${off === null ? "" : Math.abs(off) <= frame ? "on the beat" : `${off > 0 ? "+" : ""}${off}s off the beat`}${span ? `  (${JSON.stringify(span)})` : ""}`);
      return { scene: s.scene, start: s.start, offBeat: off, span };
    });
    const moves = motionOnGrid(b);
    const counts = { on: 0, near: 0, free: 0 };
    for (const m of moves) counts[m.state]++;
    log(`  moves: ${counts.on} on a beat or hit · ${counts.near} near misses · ${counts.free} free`);
    const it = currentIteration(slug);
    const out = join(it.dir, "beats.png");
    await screenshotHtml(beatsHtml(b, `${b.storyboard.title} — music (iteration ${it.n})`), out, { width: 1568 });
    writeFileSync(join(it.dir, "beats.json"), JSON.stringify({ src: b.music.spec.src, ...g, cuts, moves }, null, 2) + "\n");
    const findings = lintTimeline(b).filter((f) => f.rule === "cut-off-beat" || f.rule === "off-beat");
    if (findings.length) log(formatFindings(findings));
    emitResult({ iteration: it.n, image: out, bpm: g.bpm, beats: g.beats.length, bars: g.bars.length, hits: g.hits.length, cuts, moves: counts, findings });
    ok(rel(out));
    return 0;
  },
};
