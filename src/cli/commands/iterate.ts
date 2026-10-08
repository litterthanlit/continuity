import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { buildProject } from "../../build/build.js";
import { BUILD_DIR, rel } from "../../paths.js";
import { flagNum, flagStr, requireSlug, UsageError } from "../lib/args.js";
import { screenshotHtml, withBrowser } from "../lib/browser.js";
import type { Command } from "../lib/command.js";
import { captureFrames } from "../lib/frames.js";
import { fail, log, ok, step, warn } from "../lib/log.js";
import { report } from "../lib/project.js";
import { defaultCols, sheetHtml, type SheetCell } from "../lib/sheet.js";
import { currentIteration, iterationDir, readState, restoreIteration, updateIteration, writeState } from "../lib/store.js";

export const AXES = ["intent", "composition", "typography", "temporal", "craft"] as const;

export const score: Command = {
  name: "score",
  summary: "Record critique scores (1–5 per axis) and an optional critique file on the current iteration.",
  usage: "ct score <project> --intent N --composition N --typography N --temporal N --craft N [--note \"…\"] [--file critique.md]",
  async run(a) {
    const slug = requireSlug(a);
    const scores: Record<string, number> = {};
    for (const ax of AXES) {
      const v = flagNum(a, ax);
      if (v === undefined) throw new UsageError(`missing --${ax}`);
      if (v < 1 || v > 5) throw new UsageError(`--${ax} must be 1–5`);
      scores[ax] = v;
    }
    const it = currentIteration(slug);
    const mean = Math.round((AXES.reduce((s, k) => s + scores[k], 0) / AXES.length) * 10) / 10;
    updateIteration(slug, it.n, { scores: { ...scores, mean }, note: flagStr(a, "note") ?? it.record.note });
    const file = flagStr(a, "file");
    if (file) copyFileSync(file, join(it.dir, "critique.md"));
    ok(`iteration ${it.n}: ${AXES.map((k) => `${k} ${scores[k]}`).join(" · ")} (mean ${mean})`);
    const pass = AXES.every((k) => scores[k] >= 4);
    const st = readState(slug);
    const rec = st.iterations.find((i) => i.n === it.n);
    if (st.best === undefined && rec?.gate?.ok) {
      st.best = it.n;
      writeState(slug, st);
      ok(`iteration ${it.n} is the first scored iteration with a clean gate — marked best`);
    }
    log(pass ? "passes the bar (all axes ≥ 4) — if the gate is clean, it can ship." : "below the bar (every axis must be ≥ 4) — fix the top issues and iterate.");
    return 0;
  },
};

export const verdict: Command = {
  name: "verdict",
  summary: "Record a pairwise judgement between two iterations; promotes the winner to best when it earns it.",
  usage: "ct verdict <project> <a> <b> --winner <n> --reason \"…\"",
  async run(a) {
    const slug = requireSlug(a);
    const [na, nb] = [Number(a._[1]), Number(a._[2])];
    const winner = flagNum(a, "winner");
    const reason = flagStr(a, "reason") ?? "";
    if (!na || !nb || (winner !== na && winner !== nb)) throw new UsageError("give two iteration numbers and --winner equal to one of them");
    const s = readState(slug);
    const get = (n: number) => s.iterations.find((i) => i.n === n);
    if (!get(na) || !get(nb)) throw new UsageError("unknown iteration");
    s.verdicts.push({ a: na, b: nb, winner: winner!, reason, at: new Date().toISOString() });
    const w = get(winner!)!;
    const best = s.best ? get(s.best) : undefined;
    const gateOk = w.gate?.ok ?? false;
    if (!gateOk) warn(`#${winner} has no passing gate — not promoting to best`);
    else if (!best || (w.gate!.errors <= (best.gate?.errors ?? Infinity) && s.best !== winner)) {
      s.best = winner;
      ok(`#${winner} is now the best iteration`);
    } else log(`best stays #${s.best}`);
    writeState(slug, s);
    return 0;
  },
};

export const restore: Command = {
  name: "restore",
  summary: "Restore a previous iteration's sources (storyboard, scenes, theme, assets) into the project — e.g. back to the best.",
  usage: "ct restore <project> <n|best>",
  async run(a) {
    const slug = requireSlug(a);
    const s = readState(slug);
    const n = a._[1] === "best" ? s.best : Number(a._[1]);
    if (!n) throw new UsageError("which iteration? (number or 'best')");
    restoreIteration(slug, n);
    ok(`restored iteration ${n} sources into projects/${slug}`);
    return 0;
  },
};

export const compare: Command = {
  name: "compare",
  summary: "Side-by-side pack of two iterations at matching points of each video, in both orders (A|B and B|A) for unbiased pairwise judging.",
  usage: "ct compare <project> <a> <b> [--frames 8]",
  async run(a) {
    const slug = requireSlug(a);
    const [na, nb] = [Number(a._[1]), Number(a._[2])];
    if (!na || !nb) throw new UsageError("give two iteration numbers (see ct status)");
    const nFrames = flagNum(a, "frames") ?? 8;
    const builds = [];
    for (const n of [na, nb]) {
      const src = join(iterationDir(slug, n), "src");
      if (!existsSync(src)) throw new UsageError(`iteration ${n} has no source snapshot`);
      const outDir = join(BUILD_DIR, `${slug}@${n}`);
      const b = await buildProject(slug, { srcDir: src, outDir });
      if (!b.ok || !b.timeline) {
        report("build", b.findings);
        fail(`iteration ${n} does not build`);
        return 1;
      }
      builds.push({ n, b, outDir });
    }
    const packDir = join(iterationDir(slug, nb), `compare-${na}-${nb}`);
    mkdirSync(packDir, { recursive: true });
    const frames: Record<number, Array<{ t: number; file: string }>> = {};
    for (const { n, b, outDir } of builds) {
      const d = b.timeline!.duration;
      const times = Array.from({ length: nFrames }, (_, i) => Math.round(((i + 0.5) / nFrames) * d * 1000) / 1000);
      step(`capturing ${nFrames} frames of #${n}`);
      frames[n] = await captureFrames(slug, times, join(packDir, `i${n}`), "t", outDir);
    }
    const tl = builds[1].b.timeline!;
    const aspect = tl.width / tl.height;
    const cols = Math.min(defaultCols(aspect), nFrames);
    const rowsFor = (first: number, second: number): SheetCell[] => {
      const cells: SheetCell[] = [];
      for (let i = 0; i < nFrames; i += cols) {
        for (const [label, n] of [["A", first], ["B", second]] as const) {
          for (const f of frames[n].slice(i, i + cols)) cells.push({ src: relative(packDir, f.file), time: f.t, label: `${label} = #${n}` });
        }
      }
      return cells;
    };
    const outs: string[] = [];
    await withBrowser(async (browser) => {
      for (const [first, second, name] of [[na, nb, "pack-ab.png"], [nb, na, "pack-ba.png"]] as const) {
        const html = sheetHtml({
          title: `${slug}: A = #${first}  vs  B = #${second}`,
          meta: "rows alternate A / B at the same relative points of each video",
          cells: rowsFor(first, second),
          cols,
          aspect,
        });
        const out = join(packDir, name);
        await screenshotHtml(html, out, { width: 1568, baseDir: packDir, browser });
        outs.push(out);
      }
    });
    const scoresOf = (n: number) => readState(slug).iterations.find((i) => i.n === n)?.scores;
    writeFileSync(
      join(packDir, "README.md"),
      `# Compare #${na} vs #${nb}\n\nJudge each axis (intent, composition, typography, temporal, craft) A vs B in pack-ab.png, then again in pack-ba.png.\nIf the two passes disagree, it's a tie — keep the incumbent.\n\nRecorded scores: #${na} ${JSON.stringify(scoresOf(na) ?? {})} · #${nb} ${JSON.stringify(scoresOf(nb) ?? {})}\n`,
    );
    for (const o of outs) log(`  ${rel(o)}`);
    ok("read both packs, then: pnpm ct verdict " + `${slug} ${na} ${nb} --winner <n> --reason "…"`);
    return 0;
  },
};
