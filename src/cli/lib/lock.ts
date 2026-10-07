import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { ROOT } from "../../paths.js";

const DIR = join(ROOT, ".cache", "locks");
const STALE_MS = 20 * 60_000;

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function tryAcquire(file: string): boolean {
  try {
    const fd = openSync(file, "wx");
    writeSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }));
    closeSync(fd);
    return true;
  } catch {
    // Reclaim slots held by dead or long-stale processes.
    try {
      const { pid, at } = JSON.parse(readFileSync(file, "utf8")) as { pid: number; at: number };
      if (!alive(pid) || Date.now() - at > STALE_MS) rmSync(file, { force: true });
    } catch {
      rmSync(file, { force: true });
    }
    return false;
  }
}

/**
 * Cross-process semaphore for heavy browser work (renders, checks, snapshots).
 * Parallel scene-builders queue here instead of launching more Chromes than the
 * machine can feed. Slots default to half the CPUs (min 1); CT_BROWSER_SLOTS overrides.
 */
export async function withBrowserSlot<T>(fn: () => Promise<T>): Promise<T> {
  const slots = Math.max(1, Number(process.env.CT_BROWSER_SLOTS) || Math.floor(availableParallelism() / 2));
  mkdirSync(DIR, { recursive: true });
  let held: string | null = null;
  for (let attempt = 0; !held; attempt++) {
    for (let i = 0; i < slots && !held; i++) {
      const f = join(DIR, `browser.${i}.lock`);
      if (tryAcquire(f)) held = f;
    }
    if (!held) await new Promise((r) => setTimeout(r, Math.min(2000, 200 + attempt * 100)));
  }
  const release = () => {
    if (held && existsSync(held)) rmSync(held, { force: true });
  };
  process.once("exit", release);
  try {
    return await fn();
  } finally {
    release();
    process.removeListener("exit", release);
  }
}
