#!/usr/bin/env node
import { build } from "./commands/build.js";
import { check } from "./commands/check.js";
import { docs } from "./commands/docs.js";
import { doctor } from "./commands/doctor.js";
import { compare, restore, score, verdict } from "./commands/iterate.js";
import { lint } from "./commands/lint.js";
import { newProject } from "./commands/new.js";
import { render } from "./commands/render.js";
import { reportCmd } from "./commands/report.js";
import { sheet } from "./commands/sheet.js";
import { status } from "./commands/status.js";
import { stills } from "./commands/stills.js";
import { timeline } from "./commands/timeline.js";
import { parseArgs, UsageError } from "./lib/args.js";
import type { Command } from "./lib/command.js";
import { color, fail, log } from "./lib/log.js";

const COMMANDS: Command[] = [
  newProject,
  build,
  lint,
  check,
  timeline,
  stills,
  sheet,
  render,
  status,
  score,
  compare,
  verdict,
  restore,
  reportCmd,
  docs,
  doctor,
];

function help() {
  log(`${color.bold("continuity")} — motion design as code, with eyes.

${color.bold("Loop:")} lint → check (gate) → stills / sheet (look) → score → fix → compare/verdict → render → report

${COMMANDS.map((c) => `  ${c.name.padEnd(10)} ${c.summary}`).join("\n")}

Run \`pnpm ct <command> --help\` for options.`);
}

async function main() {
  const [name, ...rest] = process.argv.slice(2);
  if (!name || name === "help" || name === "--help" || name === "-h") {
    help();
    return 0;
  }
  const cmd = COMMANDS.find((c) => c.name === name);
  if (!cmd) {
    fail(`unknown command "${name}"`);
    help();
    return 2;
  }
  const args = parseArgs(rest);
  if (args.flags.help || args.flags.h) {
    log(`${cmd.summary}\n\nusage: ${cmd.usage}`);
    return 0;
  }
  try {
    return await cmd.run(args);
  } catch (e) {
    if (e instanceof UsageError) {
      fail(e.message);
      log(`usage: ${cmd.usage}`);
      return 2;
    }
    throw e;
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    fail(e instanceof Error ? e.stack ?? e.message : String(e));
    process.exit(1);
  },
);
