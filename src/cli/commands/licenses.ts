import { execFileSync } from "node:child_process";
import { ROOT } from "../../paths.js";
import { flagBool } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { fail, log, ok } from "../lib/log.js";

/** OSI-approved licenses (plus OFL for fonts, which the OSI also approves). */
const ALLOW = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "BlueOak-1.0.0",
  "CC0-1.0",
  "Unlicense",
  "MPL-2.0",
  "LGPL-3.0-or-later",
  "LGPL-2.1-or-later",
  "OFL-1.1",
  "Python-2.0",
  "Zlib",
]);

export const licenses: Command = {
  name: "licenses",
  summary: "Enforce the open-source policy: every production dependency must be OSI-licensed.",
  usage: "ct licenses [--verbose]",
  async run(a) {
    const raw = execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const byLicense = JSON.parse(raw) as Record<string, Array<{ name: string; versions?: string[] }>>;
    let bad = 0;
    for (const [lic, pkgs] of Object.entries(byLicense)) {
      // SPDX expressions like "(MIT OR Apache-2.0)" pass if any alternative is allowed.
      const alternatives = lic.replace(/[()]/g, "").split(/\s+OR\s+/);
      const allowed = alternatives.some((l) => ALLOW.has(l.trim()));
      if (!allowed) {
        bad += pkgs.length;
        fail(`${lic}: ${pkgs.map((p) => p.name).join(", ")}`);
      } else if (flagBool(a, "verbose")) log(`  ${lic.padEnd(20)} ${pkgs.length} package(s)`);
    }
    const total = Object.values(byLicense).reduce((s, p) => s + p.length, 0);
    if (bad) {
      fail(`${bad} production package(s) outside the OSI allowlist`);
      return 1;
    }
    ok(`${total} production packages, all OSI-licensed (${Object.keys(byLicense).join(", ")})`);
    log("note: the hyperframes CLI is a devDependency (tooling only); its Studio UI bundles GSAP, which Continuity never loads into a composition.");
    return 0;
  },
};
