/**
 * The MCP server end to end over stdio, exactly as a client runs it:
 * `node bin/ct.mjs mcp` with CT_ROOT pointing at a throwaway repo.
 * Browser-backed tools (images, check, render) run with CT_SLOW=1.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PKG_ROOT } from "../src/paths.js";

const slow = process.env.CT_SLOW === "1";

type Content = Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
interface Result {
  content: Content;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

let repo: string;
let client: Client;
let serverStderr = "";

async function call(name: string, args: Record<string, unknown> = {}): Promise<Result> {
  return (await client.callTool({ name, arguments: args }, { timeout: 600_000 })) as unknown as Result;
}

beforeAll(async () => {
  repo = mkdtempSync(join(tmpdir(), "ct-mcp-test-"));
  writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "mcp-test", private: true }));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(PKG_ROOT, "bin", "ct.mjs"), "mcp"],
    env: { ...process.env, CT_ROOT: repo } as Record<string, string>,
    stderr: "pipe",
  });
  transport.stderr?.on("data", (d: Buffer) => (serverStderr += d.toString()));
  client = new Client({ name: "continuity-tests", version: "0" });
  await client.connect(transport);
}, 60_000);

afterAll(async () => {
  await client?.close();
  rmSync(repo, { recursive: true, force: true });
});

describe("MCP server (stdio)", () => {
  it("lists the studio's tools with input schemas", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const n of ["doctor", "init_repo", "new_project", "write_project_file", "lint", "check", "stills", "contact_sheet", "render", "score", "compare", "verdict", "restore", "catalog"]) {
      expect(names).toContain(n);
    }
    expect(tools.find((t) => t.name === "check")?.inputSchema.properties).toHaveProperty("deep");
  });

  it("sets up a repo and scaffolds a project that lints clean", async () => {
    const init = await call("init_repo");
    expect(init.isError).toBeFalsy();
    const created = await call("new_project", { slug: "demo", aspect: "9:16" });
    expect(created.isError).toBeFalsy();
    const lint = await call("lint", { slug: "demo", fast: true });
    expect(lint.isError).toBeFalsy();
    expect(lint.structuredContent).toMatchObject({ ok: true, errors: 0 });
    const tl = await call("timeline", { slug: "demo" });
    expect((tl.structuredContent?.timeline as { scenes: unknown[] }).scenes.length).toBeGreaterThan(0);
    const list = await call("list_projects");
    expect(list.structuredContent?.projects).toEqual([expect.objectContaining({ slug: "demo", aspect: "9:16" })]);
  }, 120_000);

  it("writes sources through the sandbox and returns lint findings", async () => {
    const bad = await call("write_project_file", { slug: "demo", path: "scenes/hook.tsx", content: "export default 1;\n" });
    const lint = bad.structuredContent?.lint as { ok: boolean; findings: Array<{ rule: string; source: string }> };
    expect(lint.ok).toBe(false);
    expect(lint.findings.map((f) => `${f.source}:${f.rule}`)).toContain("build:scene-export");
    const files = await call("list_project_files", { slug: "demo" });
    expect((files.structuredContent?.files as Array<{ path: string }>).map((f) => f.path)).toContain("scenes/hook.tsx");
    expect((await call("read_project_file", { slug: "demo", path: "scenes/hook.tsx" })).content[0].text).toBe("export default 1;\n");
  }, 120_000);

  it("refuses paths outside a project's sources", async () => {
    for (const path of ["../../package.json", "scenes/../../x.tsx", "/etc/passwd", "build/index.html", ".continuity/state.json", "scenes/x.js"]) {
      const r = await call("write_project_file", { slug: "demo", path, content: "x" });
      expect(r.isError, path).toBe(true);
      expect((await call("read_project_file", { slug: "demo", path })).isError, path).toBe(true);
    }
    expect((await call("new_project", { slug: "../evil" })).isError).toBe(true);
  });

  it("serves the guides as resources and the workflows as prompts", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toEqual(expect.arrayContaining(["continuity://guide/motion-craft", "continuity://guide/continuity/reference/api.md"]));
    const guide = await client.readResource({ uri: "continuity://guide/motion-craft" });
    const body = (guide.contents[0] as { text: string }).text;
    expect(body).toContain("contact_sheet"); // CLI → tool mapping header
    expect(body.length).toBeGreaterThan(2000);
    const prompt = await client.getPrompt({ name: "make-video", arguments: { brief: "A 15s reel for a note-taking app" } });
    expect((prompt.messages[0].content as { text: string }).text).toContain("contact_sheet");
    const review = await client.getPrompt({ name: "review", arguments: { slug: "demo" } });
    expect((review.messages[0].content as { text: string }).text).toContain("score");
  });

  it("returns the catalog and keeps stdout protocol-only", async () => {
    const cat = await call("catalog");
    expect(cat.content[0].text).toContain("## Timeline lint rules");
    // Anything the server printed outside JSON-RPC would have broken the client; logs go to stderr.
    expect(serverStderr).toContain("continuity MCP server ready");
  });
});

(slow ? describe : describe.skip)("MCP server — browser tools", () => {
  it("restores a clean scene, gates it, and returns stills + contact sheet as images", async () => {
    // Put the template scene back (the sandbox test broke it) by recreating the project.
    rmSync(join(repo, "projects", "demo"), { recursive: true, force: true });
    expect((await call("new_project", { slug: "demo", aspect: "9:16" })).isError).toBeFalsy();
    const check = await call("check", { slug: "demo" });
    expect(check.structuredContent).toMatchObject({ ok: true, errors: 0, iteration: 1 });

    for (const [tool, args] of [["stills", { slug: "demo" }], ["contact_sheet", { slug: "demo" }], ["motion_strip", { slug: "demo", scene: "hook" }]] as const) {
      const r = await call(tool, args);
      const images = r.content.filter((c) => c.type === "image");
      expect(images.length, tool).toBeGreaterThan(0);
      for (const img of images) {
        expect(img.mimeType).toBe("image/png");
        const meta = await sharp(Buffer.from(img.data!, "base64")).metadata();
        expect(Math.max(meta.width!, meta.height!), tool).toBeLessThanOrEqual(1568);
      }
    }
  }, 300_000);

  it("renders a draft with clean QC", async () => {
    const r = await call("render", { slug: "demo", draft: true });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent).toMatchObject({ ok: true, draft: true });
    expect(String(r.structuredContent?.output)).toMatch(/demo-.*-draft\.mp4$/);
  }, 300_000);
});
