import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ROOT } from "../../paths.js";
import type { Command } from "../lib/command.js";
import { resolveBrowser } from "../lib/env.js";
import { fail, log, ok, warn } from "../lib/log.js";

const require = createRequire(join(ROOT, "package.json"));

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
    const node = process.versions.node;
    if (Number(node.split(".")[0]) >= 22) ok(`node ${node}`);
    else {
      fail(`node ${node} (need ≥ 22)`);
      bad++;
    }
    const hf = JSON.parse(readFileSync(require.resolve("hyperframes/package.json"), "utf8")).version;
    const pinned = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).devDependencies.hyperframes;
    if (hf === pinned) ok(`hyperframes ${hf} (pinned)`);
    else {
      warn(`hyperframes ${hf} but package.json pins ${pinned} — run pnpm install`);
      bad++;
    }
    const browser = resolveBrowser();
    if (browser) ok(`chrome  ${version(browser, ["--version"]) ?? "?"}  ${browser}`);
    else {
      warn("no local headless Chrome found — set CT_BROWSER_PATH, or let HyperFrames download its pinned chrome-headless-shell");
      bad++;
    }
    const ff = version(process.env.HYPERFRAMES_FFMPEG_PATH || "ffmpeg", ["-version"]);
    if (ff) ok(ff.replace(/ Copyright.*/, ""));
    else {
      fail("ffmpeg not found on PATH");
      bad++;
    }
    log(bad ? `\n${bad} issue(s).` : "\nready.");
    return bad ? 1 : 0;
  },
};
