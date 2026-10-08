import { flagBool } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { log } from "../lib/log.js";

const PKG = "@litterthanlit/continuity";

function config(): string {
  const json = JSON.stringify(
    { mcpServers: { continuity: { command: "npx", args: ["-y", `--package=${PKG}`, "ct", "mcp"], env: { CT_ROOT: "/absolute/path/to/your/repo" } } } },
    null,
    2,
  );
  return `Continuity MCP server — stdio. Set CT_ROOT to the repo that holds your projects
(or start the server with that repo as its working directory).

Claude Desktop (claude_desktop_config.json) · Cursor (.cursor/mcp.json) · Windsurf · most clients:
${json}

VS Code (.vscode/mcp.json): the same object under "servers" instead of "mcpServers".

Claude Code:
  claude mcp add continuity -e CT_ROOT="$PWD" -- npx -y --package=${PKG} ct mcp

Codex (~/.codex/config.toml):
  [mcp_servers.continuity]
  command = "npx"
  args = ["-y", "--package=${PKG}", "ct", "mcp"]
  env = { CT_ROOT = "/absolute/path/to/your/repo" }

Already installed in the repo (npm i -D ${PKG})? Use command "npx", args ["ct", "mcp"].
Renders and full checks can run for minutes: raise the client's tool timeout if it has one
(the server sends progress notifications while they run).`;
}

export const mcp: Command = {
  name: "mcp",
  summary: "Run the Continuity MCP server (stdio) — the gate, eyes and studio as tools for any MCP client. --config prints client setup.",
  usage: "ct mcp [--config]",
  async run(a) {
    if (flagBool(a, "config")) {
      log(config());
      return 0;
    }
    const { serveStdio } = await import("../../mcp/server.js");
    await serveStdio();
    // Keep running until the client closes stdin.
    await new Promise<void>((resolve) => process.stdin.on("close", resolve));
    return 0;
  },
};
