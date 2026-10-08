#!/usr/bin/env node
// `ct` — the Continuity CLI. Runs the TypeScript engine through tsx, with a
// generated tsconfig that gives the user's scene files preact JSX, and a resolve
// hook that points `continuity` / `preact` at this package's copies.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { register as registerHooks } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "tsx/esm/api";

const PKG_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(PKG_ROOT, "src", "index.ts");

registerHooks("./loader-hooks.mjs", import.meta.url, {
  data: { entryURL: pathToFileURL(entry).href, pkgJsonURL: pathToFileURL(join(PKG_ROOT, "package.json")).href },
});

// 1. Resolve the user's repo layout (plain TS, no JSX — needs no tsconfig).
const bootstrap = register({ tsconfig: false });
const { BUILD_DIR, PROJECTS_DIR } = await import(pathToFileURL(join(PKG_ROOT, "src", "paths.ts")).href);
await bootstrap();

// 2. A tsconfig for everything tsx compiles from here on: the user's projects
//    (including iteration snapshots under the .continuity dot-dirs, which TS
//    globs skip unless named explicitly).
const tsconfigDir = join(BUILD_DIR, ".ct");
const projects = relative(tsconfigDir, PROJECTS_DIR).split("\\").join("/");
const tsconfig = {
  compilerOptions: {
    target: "ES2023",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    jsx: "react-jsx",
    jsxImportSource: "preact",
    strict: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
  },
  include: [`${projects}/**/*`, `${projects}/*/.continuity/**/*`],
};
const tsconfigPath = join(tsconfigDir, "tsconfig.json");
mkdirSync(tsconfigDir, { recursive: true });
const next = JSON.stringify(tsconfig, null, 2) + "\n";
let prev = "";
try {
  prev = readFileSync(tsconfigPath, "utf8");
} catch {
  /* first run */
}
if (prev !== next) writeFileSync(tsconfigPath, next);
register({ tsconfig: tsconfigPath });

await import(pathToFileURL(join(PKG_ROOT, "src", "cli", "index.ts")).href);
