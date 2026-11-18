/** The MCP server's child runner and per-project queue (src/mcp/run.ts), without a client. */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCt, serialized } from "../src/mcp/run.js";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("serialized (one project's calls, one at a time)", () => {
  it("a rejected call leaves no unhandled rejection, and later calls still run", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (e: unknown) => unhandled.push(e);
    process.on("unhandledRejection", onUnhandled);
    try {
      await expect(serialized("rejects", () => Promise.reject(new Error("cancelled")))).rejects.toThrow("cancelled");
      await wait(50);
      expect(unhandled).toEqual([]);
      expect(await serialized("rejects", async () => 42)).toBe(42);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("runs one key's calls in order, and another key's alongside", async () => {
    const log: string[] = [];
    const job = (name: string, ms: number) => async () => {
      log.push(`start ${name}`);
      await wait(ms);
      log.push(`end ${name}`);
      return name;
    };
    const all = await Promise.all([serialized("a", job("a1", 40)), serialized("a", job("a2", 5)), serialized("b", job("b1", 5))]);
    expect(all).toEqual(["a1", "a2", "b1"]);
    expect(log.indexOf("end a1")).toBeLessThan(log.indexOf("start a2"));
    expect(log.indexOf("start b1")).toBeLessThan(log.indexOf("end a1"));
  });
});

describe("runCt", () => {
  it("a call cancelled before it starts runs nothing", async () => {
    const root = mkdtempSync(join(tmpdir(), "ct-mcp-run-"));
    writeFileSync(join(root, "package.json"), "{}");
    try {
      await expect(runCt(["new", "demo"], { root, signal: AbortSignal.abort() })).rejects.toThrow("cancelled");
      expect(existsSync(join(root, "projects", "demo"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
