import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PKG_ROOT } from "../../paths.js";
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

type LicenseMap = Record<string, Array<{ name: string }>>;

/** In the Continuity checkout: pnpm knows the exact production tree. */
function pnpmLicenses(): LicenseMap {
  const raw = execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], { cwd: PKG_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(raw) as LicenseMap;
}

/** As an installed package: walk the production dependency graph as Node resolves it. */
function installedLicenses(): LicenseMap {
  const out: LicenseMap = {};
  const seen = new Set<string>();
  const visit = (pkgJson: string) => {
    const dir = dirname(pkgJson);
    if (seen.has(dir)) return;
    seen.add(dir);
    const pkg = JSON.parse(readFileSync(pkgJson, "utf8")) as { name: string; license?: string | { type?: string }; dependencies?: Record<string, string> };
    const lic = (typeof pkg.license === "string" ? pkg.license : pkg.license?.type) ?? "UNKNOWN";
    if (dir !== PKG_ROOT) (out[lic] ??= []).push({ name: pkg.name });
    const req = createRequire(pkgJson);
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      const found = findPackageJson(req, dep);
      if (found) visit(found);
    }
  };
  visit(join(PKG_ROOT, "package.json"));
  return out;
}

function findPackageJson(req: NodeJS.Require, name: string): string | undefined {
  try {
    return req.resolve(`${name}/package.json`);
  } catch {
    for (const base of req.resolve.paths(name) ?? []) {
      const f = join(base, name, "package.json");
      if (existsSync(f)) return f;
    }
    return undefined; // optional platform-specific dependency not installed
  }
}

export const licenses: Command = {
  name: "licenses",
  summary: "Enforce the open-source policy: every production dependency must be OSI-licensed.",
  usage: "ct licenses [--verbose]",
  async run(a) {
    const byLicense = existsSync(join(PKG_ROOT, "pnpm-lock.yaml")) ? pnpmLicenses() : installedLicenses();
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
    log("note: hyperframes (Apache-2.0) is the render engine; its optional Studio UI bundles GSAP, which Continuity never loads into a composition.");
    return 0;
  },
};
