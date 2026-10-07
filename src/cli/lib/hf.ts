import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { ROOT } from "../../paths.js";
import { hfEnv } from "./env.js";
import { withBrowserSlot } from "./lock.js";

const require = createRequire(join(ROOT, "package.json"));

function hfBin(): string {
  const pkgJson = require.resolve("hyperframes/package.json");
  const pkg = JSON.parse(readFileSync(pkgJson, "utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.hyperframes;
  return join(dirname(pkgJson), bin);
}

export interface HfResult {
  code: number;
  stdout: string;
  stderr: string;
}

const HEAVY = new Set(["render", "check", "snapshot", "benchmark"]);

/** Run the pinned HyperFrames CLI with the Continuity environment (browser-heavy commands take a slot). */
export function runHf(
  args: string[],
  opts: { cwd?: string; quiet?: boolean; onLine?: (line: string) => void; timeoutMs?: number } = {},
): Promise<HfResult> {
  return HEAVY.has(args[0]) ? withBrowserSlot(() => spawnHf(args, opts)) : spawnHf(args, opts);
}

function spawnHf(
  args: string[],
  opts: { cwd?: string; quiet?: boolean; onLine?: (line: string) => void; timeoutMs?: number } = {},
): Promise<HfResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hfBin(), ...args], {
      cwd: opts.cwd ?? ROOT,
      env: hfEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let buf = "";
    const timer = opts.timeoutMs ? setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs) : null;
    child.stdout.on("data", (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      if (opts.onLine) {
        buf += s;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) opts.onLine(l);
      }
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/** Parse the JSON document out of a `--json` invocation (tolerates log lines around it). */
export function parseJsonOutput<T = unknown>(out: string): T {
  const start = out.indexOf("{");
  const end = out.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("HyperFrames returned no JSON:\n" + out.slice(0, 2000));
  return JSON.parse(out.slice(start, end + 1)) as T;
}
