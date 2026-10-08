import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PKG_ROOT } from "../paths.js";

/**
 * Every engine operation runs in a fresh `ct` child process: scene modules are
 * imported fresh (Node's ESM cache would otherwise serve stale scenes after an
 * edit), stdout stays free for the MCP protocol, and a crash or hang can't take
 * the server down. The child writes its structured result to CT_RESULT_FILE.
 */
export interface CtRun {
  code: number;
  /** Human log (stdout + stderr), ANSI-free. */
  log: string;
  result: Record<string, unknown>;
}

const ANSI = /\x1b\[[0-9;]*m/g;

export function runCt(
  args: string[],
  opts: { root: string; signal?: AbortSignal; onProgress?: (elapsedS: number, lastLine: string) => void; timeoutMs?: number },
): Promise<CtRun> {
  const dir = mkdtempSync(join(tmpdir(), "ct-mcp-"));
  const resultFile = join(dir, "result.json");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(PKG_ROOT, "bin", "ct.mjs"), ...args], {
      cwd: opts.root,
      env: { ...process.env, CT_ROOT: opts.root, CT_RESULT_FILE: resultFile, NO_COLOR: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    let last = "";
    const take = (chunk: Buffer) => {
      const s = chunk.toString("utf8").replace(ANSI, "");
      log += s;
      const lines = s.split(/[\r\n]+/).filter((l) => l.trim() && !l.startsWith("@hf-progress"));
      if (lines.length) last = lines[lines.length - 1].trim();
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    const t0 = Date.now();
    const tick = opts.onProgress ? setInterval(() => opts.onProgress!((Date.now() - t0) / 1000, last), 5000) : undefined;
    const kill = () => child.kill("SIGTERM");
    opts.signal?.addEventListener("abort", kill, { once: true });
    const timer = setTimeout(kill, opts.timeoutMs ?? 60 * 60_000);
    const done = () => {
      if (tick) clearInterval(tick);
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", kill);
    };
    child.on("error", (e) => {
      done();
      rmSync(dir, { recursive: true, force: true });
      reject(e);
    });
    child.on("close", (code) => {
      done();
      let result: Record<string, unknown> = {};
      try {
        result = JSON.parse(readFileSync(resultFile, "utf8"));
      } catch {
        /* the command produced no structured result (e.g. it crashed) */
      }
      rmSync(dir, { recursive: true, force: true });
      if (opts.signal?.aborted) return reject(new Error("cancelled"));
      resolve({ code: code ?? 1, log: log.replace(/@hf-progress[^\n]*\n?/g, ""), result });
    });
  });
}

/** Operations on one project run one at a time (builds rewrite build/<slug>); different projects run in parallel. */
const queues = new Map<string, Promise<unknown>>();
export function serialized<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  queues.set(
    key,
    next.finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    }),
  );
  return next;
}
