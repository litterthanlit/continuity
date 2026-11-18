/**
 * The iteration store against a throwaway repo. The work root is fixed when src/paths.ts is first
 * imported, so CT_ROOT is set before the store is imported: every import of engine code in this
 * file is dynamic for that reason. Do not add a static import of anything under src/.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let root: string;
let store: typeof import("../src/cli/lib/store.js");
let sourceHash: typeof import("../src/build/hash.js").sourceHash;
const previousRoot = process.env.CT_ROOT;
const sceneFile = () => join(root, "projects", "demo", "scenes", "a.tsx");

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "ct-store-"));
  writeFileSync(join(root, "continuity.json"), "{}");
  mkdirSync(join(root, "projects", "demo", "scenes"), { recursive: true });
  writeFileSync(join(root, "projects", "demo", "storyboard.json"), "{}");
  writeFileSync(sceneFile(), "export default 1;\n");
  process.env.CT_ROOT = root;
  const paths = await import("../src/paths.js");
  // If this fails, src/paths.ts was imported before CT_ROOT was set and the tests would write into the real repo.
  expect(paths.PROJECTS_DIR).toBe(join(root, "projects"));
  store = await import("../src/cli/lib/store.js");
  ({ sourceHash } = await import("../src/build/hash.js"));
});

afterAll(() => {
  if (previousRoot === undefined) delete process.env.CT_ROOT;
  else process.env.CT_ROOT = previousRoot;
  rmSync(root, { recursive: true, force: true });
});

describe("recordCheck", () => {
  it("records the gate on the iteration of the sources that were audited", () => {
    const r = store.recordCheck("demo", sourceHash("demo").combined, []);
    expect(r.stale).toBe(false);
    expect(existsSync(r.findingsFile!)).toBe(true);
    expect(store.readState("demo").iterations.at(-1)!.gate?.ok).toBe(true);
  });

  it("records nothing when the sources changed while the check ran", () => {
    const built = sourceHash("demo").combined;
    writeFileSync(sceneFile(), "export default 2;\n");
    const r = store.recordCheck("demo", built, []);
    expect(r.stale).toBe(true);
    expect(r.findingsFile).toBeNull();
    expect(r.findings.map((f) => `${f.severity}:${f.rule}`)).toEqual(["error:sources-changed"]);
    const last = store.readState("demo").iterations.at(-1)!;
    expect(last.hash).toBe(sourceHash("demo").combined);
    expect(last.gate).toBeUndefined();
    expect(existsSync(join(store.iterationDir("demo", last.n), "findings.json"))).toBe(false);
  });

  it("a scene check stores its findings and never sets the gate", () => {
    writeFileSync(sceneFile(), "export default 3;\n");
    const r = store.recordCheck("demo", sourceHash("demo").combined, [], "a");
    expect(r.findingsFile!.endsWith("findings-a.json")).toBe(true);
    expect(store.readState("demo").iterations.at(-1)!.gate).toBeUndefined();
  });

  it("an error finding records a failed gate", () => {
    writeFileSync(sceneFile(), "export default 4;\n");
    store.recordCheck("demo", sourceHash("demo").combined, [{ source: "lint", rule: "read-time", severity: "error", message: "x" }]);
    expect(store.readState("demo").iterations.at(-1)!.gate).toMatchObject({ ok: false, errors: 1 });
  });
});

describe("iterationForHash", () => {
  it("returns the newest iteration with that hash", () => {
    const gate = { ok: true, errors: 0, warnings: 0, at: "" };
    const state = {
      verdicts: [],
      iterations: [
        { n: 1, hash: "aaa", createdAt: "" },
        { n: 2, hash: "bbb", createdAt: "" },
        { n: 3, hash: "aaa", createdAt: "", gate },
      ],
    };
    expect(store.iterationForHash(state, "aaa")?.n).toBe(3);
    expect(store.iterationForHash(state, "zzz")).toBeUndefined();
  });
});
