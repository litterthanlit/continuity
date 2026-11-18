/** `ct init` in throwaway repos: it must not drop or overwrite what is the user's. */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PKG_ROOT } from "../src/paths.js";

const made: string[] = [];
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "ct-init-"));
  made.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}
const init = (root: string) => spawnSync(process.execPath, [join(PKG_ROOT, "bin", "ct.mjs"), "init"], { cwd: root, env: { ...process.env, CT_ROOT: root }, encoding: "utf8" });

describe("ct init", () => {
  it("refuses a managed block whose end marker is gone, and leaves the file alone", () => {
    const claude = "# Mine\n\n<!-- continuity:begin (managed by `npx ct init`) -->\nold block\n\n## My own notes below\nkeep me\n";
    const root = repo({ "package.json": '{ "type": "module" }\n', "CLAUDE.md": claude });
    const r = init(root);
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/without "<!-- continuity:end -->"/);
    expect(readFileSync(join(root, "CLAUDE.md"), "utf8")).toBe(claude);
  });

  it("refuses to replace a package.json that the projects dir already has", () => {
    const pkg = '{\n  "name": "videos",\n  "scripts": { "build": "tsc" }\n}\n';
    const root = repo({ "package.json": "{}\n", "continuity.json": '{ "projectsDir": "videos" }\n', "videos/package.json": pkg });
    const r = init(root);
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/is not an ES module package/);
    expect(readFileSync(join(root, "videos", "package.json"), "utf8")).toBe(pkg);
  });

  it("still sets up a plain repo", () => {
    const root = repo({ "package.json": "{}\n" });
    const r = init(root);
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(join(root, "projects", "package.json"), "utf8"))).toEqual({ type: "module" });
    expect(readFileSync(join(root, "CLAUDE.md"), "utf8")).toMatch(/continuity:end/);
  });
});
