import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BUILD_DIR, PKG_ROOT } from "../paths.js";
import type { MusicSpec } from "../spec/storyboard.js";
import { analyzeFile, type BeatAnalysis } from "./analyze.js";
import { musicGrid, type MusicGrid } from "./grid.js";

export interface Music {
  spec: MusicSpec;
  /** Absolute path of the track. */
  file: string;
  analysis: BeatAnalysis;
  grid: MusicGrid;
}

/**
 * Analyse a project's track, cached under build/.ct/music by the bytes of the track, the
 * analysis options and the analyser's own source — so an unchanged track is analysed once,
 * and a change to any of the three re-analyses it.
 */
export async function loadMusic(srcDir: string, spec: MusicSpec): Promise<Music> {
  const file = join(srcDir, spec.src);
  if (!existsSync(file)) throw new Error(`music: ${spec.src} not found in the project`);
  const opts = { bpm: spec.bpm, beatsPerBar: spec.beatsPerBar, firstDownbeat: spec.downbeat };
  const key = createHash("sha256")
    .update(readFileSync(file))
    .update(JSON.stringify(opts))
    .update(readFileSync(join(PKG_ROOT, "src", "audio", "analyze.ts")))
    .update(readFileSync(join(PKG_ROOT, "src", "audio", "wav.ts")))
    .digest("hex")
    .slice(0, 16);
  const cacheDir = join(BUILD_DIR, ".ct", "music");
  const cached = join(cacheDir, `${key}.json`);
  let analysis: BeatAnalysis;
  if (existsSync(cached)) analysis = JSON.parse(readFileSync(cached, "utf8")) as BeatAnalysis;
  else {
    analysis = await analyzeFile(file, opts);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cached, JSON.stringify(analysis) + "\n");
  }
  return { spec, file, analysis, grid: musicGrid(analysis, { start: spec.start, offset: spec.offset }) };
}
