// Node module resolve hook (registered by bin/ct.mjs). User scene files import
// `continuity` and preact's JSX runtime; both must resolve to the *package's*
// copies — whatever package manager or layout the user's repo has — so scenes,
// the kit and the renderer share one module instance (the kit keeps the active
// scene in module state, and preact vnodes must come from one preact).
let entryURL = "";
let pkgJsonURL = "";

export function initialize(data) {
  entryURL = data.entryURL;
  pkgJsonURL = data.pkgJsonURL;
}

const ALIASES = new Set(["continuity", "@litterthanlit/continuity"]);

export async function resolve(specifier, context, nextResolve) {
  if (ALIASES.has(specifier)) return { url: entryURL, shortCircuit: true };
  if (specifier === "preact" || specifier.startsWith("preact/")) {
    return nextResolve(specifier, { ...context, parentURL: pkgJsonURL });
  }
  return nextResolve(specifier, context);
}
