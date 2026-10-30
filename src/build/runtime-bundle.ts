import { build } from "esbuild";
import { join } from "node:path";
import { PKG_ROOT } from "../paths.js";

let cached: string | null = null;
let cachedGl: string | null = null;

/**
 * Bundle the browser runtime to a single classic script (IIFE). HyperFrames
 * inlines local classic scripts into the composition at render time.
 * Template literals are lowered to concatenation: the HyperFrames bundler's
 * CSS parser chokes on interpolations inside inline scripts.
 */
export async function runtimeBundle(): Promise<string> {
  if (cached) return cached;
  const result = await build({
    entryPoints: [join(PKG_ROOT, "src/runtime/index.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome120",
    supported: { "template-literal": false },
    minify: false,
    legalComments: "none",
    write: false,
    logLevel: "silent",
  });
  cached = "/* Continuity motion runtime — Apache-2.0 */\n" + result.outputFiles[0].text;
  return cached;
}

/**
 * The GL runtime (three.js + Continuity's materials and post), a separate classic script that
 * only compositions with a `<Gl>` canvas load. Minified: three is most of its weight.
 */
export async function glBundle(): Promise<string> {
  if (cachedGl) return cachedGl;
  const result = await build({
    entryPoints: [join(PKG_ROOT, "src/gl/runtime.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome120",
    supported: { "template-literal": false },
    minify: true,
    legalComments: "none",
    write: false,
    logLevel: "silent",
  });
  cachedGl = "/* Continuity GL runtime — Apache-2.0; three.js — MIT (c) 2010-2026 three.js authors */\n" + result.outputFiles[0].text;
  return cachedGl;
}
