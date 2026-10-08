import { build } from "esbuild";
import { join } from "node:path";
import { PKG_ROOT } from "../paths.js";

let cached: string | null = null;

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
