import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { PKG_ROOT, findWorkRoot } from "../paths.js";
import { INSTRUCTIONS, makeVideoPrompt, reviewPrompt } from "./prompts.js";
import { listGuides, readGuide } from "./resources.js";
import { registerTools, type Workspace } from "./tools.js";

/**
 * `ct mcp` — Continuity over the Model Context Protocol (stdio). The server
 * itself only routes: every engine operation runs in a child `ct` process.
 */
export function createServer(): McpServer {
  const { version } = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8")) as { version: string };
  const server = new McpServer({ name: "continuity", title: "Continuity", version }, { instructions: INSTRUCTIONS });

  // Workspace repo: $CT_ROOT, else the client's first root (clients on the 2025 protocol), else cwd.
  let rootP: Promise<string> | undefined;
  const ws: Workspace = {
    root: () =>
      (rootP ??= (async () => {
        if (process.env.CT_ROOT) return resolve(process.env.CT_ROOT);
        try {
          if (server.server.getClientCapabilities()?.roots) {
            const { roots } = await server.server.listRoots();
            const first = roots.find((r) => r.uri.startsWith("file://"));
            if (first) return findWorkRoot(fileURLToPath(first.uri), {});
          }
        } catch {
          /* roots unsupported on this protocol revision — fall through */
        }
        return findWorkRoot(process.cwd(), {});
      })()),
  };

  registerTools(server, ws);

  for (const g of listGuides()) {
    server.registerResource(g.name, g.uri, { title: g.title, description: g.description, mimeType: "text/markdown" }, async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: readGuide(g) }],
    }));
  }

  server.registerPrompt(
    "make-video",
    {
      title: "Make a video",
      description: "Make a motion design video end-to-end from a brief: plan → style frames → motion → gate → look → critique → iterate → render.",
      argsSchema: z.object({ brief: z.string().describe("What the video is for, who it's for, the one thing to remember, CTA, format"), aspect: z.string().optional(), theme: z.string().optional(), type: z.string().optional() }),
    },
    ({ brief, aspect, theme, type }) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: makeVideoPrompt({ brief, aspect, theme, type }) } }] }),
  );

  server.registerPrompt(
    "review",
    {
      title: "Review a project",
      description: "Score a project on the 5-axis rubric from real evidence and return a prioritized fix list (optionally judge it against another iteration).",
      argsSchema: z.object({ slug: z.string(), compareWith: z.string().optional().describe("Iteration number to compare the current one against") }),
    },
    ({ slug, compareWith }) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: reviewPrompt({ slug, compareWith }) } }] }),
  );

  return server;
}

export async function serveStdio(): Promise<void> {
  // stdout carries the protocol: anything else that tries to print goes to stderr.
  const toErr = (...a: unknown[]) => process.stderr.write(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ") + "\n");
  console.log = toErr;
  console.info = toErr;
  console.debug = toErr;
  console.warn = toErr;
  const server = createServer();
  await server.connect(new StdioServerTransport());
  process.stderr.write("continuity MCP server ready (stdio)\n");
}
