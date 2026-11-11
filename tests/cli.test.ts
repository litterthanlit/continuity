/**
 * The ct CLI as a child process with stdout on a pipe — how agents' shell tools,
 * `| jq` and CI read it.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PKG_ROOT } from "../src/paths.js";

function ct(args: string[]): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(PKG_ROOT, "bin", "ct.mjs"), ...args], { cwd: PKG_ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout }));
  });
}

describe("ct with stdout on a pipe", () => {
  it("prints a --json document larger than the pipe buffer whole", async () => {
    // _launch's timeline is about 260 KB; a pipe buffer is 64 KB.
    const r = await ct(["timeline", "_launch", "--json"]);
    expect(r.code).toBe(0);
    expect(Buffer.byteLength(r.stdout)).toBeGreaterThan(65536);
    expect(() => JSON.parse(r.stdout)).not.toThrow();
  });

  it("keeps its exit codes: 2 for an unknown command and for a usage error", async () => {
    expect((await ct(["no-such-command"])).code).toBe(2);
    expect((await ct(["timeline"])).code).toBe(2);
  });
});
