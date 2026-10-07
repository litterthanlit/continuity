import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Locate a Chrome headless shell for HyperFrames without downloading one.
 * Order: CT_BROWSER_PATH → HYPERFRAMES_BROWSER_PATH → newest Playwright
 * chromium_headless_shell → undefined (HyperFrames falls back to its own
 * cache/download).
 */
export function resolveBrowser(): string | undefined {
  for (const v of [process.env.CT_BROWSER_PATH, process.env.HYPERFRAMES_BROWSER_PATH]) {
    if (v && existsSync(v)) return v;
  }
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers", join(homedir(), ".cache", "ms-playwright")].filter(
    (r): r is string => Boolean(r) && existsSync(r as string),
  );
  const candidates: { path: string; rev: number }[] = [];
  for (const root of roots) {
    for (const name of readdirSync(root)) {
      const m = /^chromium_headless_shell-(\d+)$/.exec(name);
      if (!m) continue;
      for (const sub of ["chrome-linux/headless_shell", "chrome-headless-shell-linux64/chrome-headless-shell", "chrome-linux64/headless_shell"]) {
        const p = join(root, name, sub);
        if (existsSync(p)) candidates.push({ path: p, rev: Number(m[1]) });
      }
    }
  }
  candidates.sort((a, b) => b.rev - a.rev);
  return candidates[0]?.path;
}

/**
 * Environment for every HyperFrames invocation: no telemetry, no update
 * checks, no auto-installs, never ship frames to a third-party vision API,
 * and a pinned local browser.
 */
export function hfEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HYPERFRAMES_NO_TELEMETRY: "1",
    DO_NOT_TRACK: "1",
    HYPERFRAMES_NO_UPDATE_CHECK: "1",
    HYPERFRAMES_NO_AUTO_INSTALL: "1",
    HYPERFRAMES_SKIP_SKILLS: "1",
    PUPPETEER_SKIP_DOWNLOAD: "1",
    ...extra,
  };
  delete env.GEMINI_API_KEY;
  delete env.HYPERFRAMES_GEMINI_MODEL;
  const browser = resolveBrowser();
  if (browser) env.HYPERFRAMES_BROWSER_PATH = browser;
  return env;
}
