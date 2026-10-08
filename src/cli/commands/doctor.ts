import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PKG_ROOT, PROJECTS_DIR, WORK_ROOT, rel } from "../../paths.js";
import type { Command } from "../lib/command.js";
import { resolveBrowser } from "../lib/env.js";
import { fail, log, ok, warn } from "../lib/log.js";
import { emitResult } from "../lib/result.js";

const require = createRequire(join(PKG_ROOT, "package.json"));

function version(cmd: string, args: string[]): string | null {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n")[0].trim();
  } catch {
    return null;
  }
}

export const doctor: Command = {
  name: "doctor",
  summary: "Check the toolchain: Node, HyperFrames pin, headless Chrome, ffmpeg.",
  usage: "ct doctor",
  async run() {
    let bad = 0;
    const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
    const note = (name: string, good: boolean, detail: string) => checks.push({ name, ok: good, detail });
    const node = process.versions.node;
    note("node", Number(node.split(".")[0]) >= 22, `node ${node} (need ≥ 22)`);
    if (Number(node.split(".")[0]) >= 22) ok(`node ${node}`);
    else {
      fail(`node ${node} (need ≥ 22)`);
      bad++;
    }
    const hf = JSON.parse(readFileSync(require.resolve("hyperframes/package.json"), "utf8")).version;
    const manifest = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));
    const pinned = manifest.dependencies?.hyperframes ?? manifest.devDependencies?.hyperframes;
    note("hyperframes", hf === pinned, `hyperframes ${hf}, pinned ${pinned}`);
    if (hf === pinned) ok(`hyperframes ${hf} (pinned)`);
    else {
      warn(`hyperframes ${hf} but package.json pins ${pinned} — reinstall dependencies`);
      bad++;
    }
    const browser = resolveBrowser();
    note("chrome", Boolean(browser), browser ? `${version(browser, ["--version"]) ?? "?"} at ${browser}` : "no local headless Chrome — set CT_BROWSER_PATH or run `npx playwright install chromium-headless-shell`");
    if (browser) ok(`chrome  ${version(browser, ["--version"]) ?? "?"}  ${browser}`);
    else {
      warn("no local headless Chrome found — set CT_BROWSER_PATH, run `npx playwright install chromium-headless-shell`, or let HyperFrames download its pinned chrome-headless-shell");
      bad++;
    }
    const ff = version(process.env.HYPERFRAMES_FFMPEG_PATH || "ffmpeg", ["-version"]);
    note("ffmpeg", Boolean(ff), ff ? ff.replace(/ Copyright.*/, "") : "ffmpeg not found on PATH");
    if (ff) ok(ff.replace(/ Copyright.*/, ""));
    else {
      fail("ffmpeg not found on PATH");
      bad++;
    }
    emitResult({ ready: bad === 0, checks, repo: WORK_ROOT, projectsDir: PROJECTS_DIR, engine: PKG_ROOT });
    log(`  repo     ${WORK_ROOT}  (projects: ${rel(PROJECTS_DIR)})`);
    log(`  engine   ${PKG_ROOT}`);
    log(bad ? `\n${bad} issue(s).` : "\nready.");
    return bad ? 1 : 0;
  },
};
