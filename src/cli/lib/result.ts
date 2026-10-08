import { writeFileSync } from "node:fs";

/**
 * Machine-readable command results. When `CT_RESULT_FILE` is set (the MCP server
 * runs every command in a child process with it), each call shallow-merges `data`
 * into the result and rewrites the file; the human log on stdout is unchanged.
 * Paths in results are absolute.
 */
let acc: Record<string, unknown> = {};

export function emitResult(data: Record<string, unknown>): void {
  const file = process.env.CT_RESULT_FILE;
  if (!file) return;
  acc = { ...acc, ...data };
  writeFileSync(file, JSON.stringify(acc));
}
