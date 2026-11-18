export interface Args {
  _: string[];
  flags: Record<string, string | boolean>;
}

/** `ct cmd a b --flag value --bool --k=v` → { _: [a, b], flags: { flag: "value", bool: true, k: "v" } } */
export function parseArgs(argv: string[]): Args {
  const out: Args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const body = a.slice(2);
      const eq = body.indexOf("=");
      if (eq >= 0) out.flags[body.slice(0, eq)] = body.slice(eq + 1);
      else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) out.flags[body] = argv[++i];
      else out.flags[body] = true;
    } else out._.push(a);
  }
  return out;
}

export function flagStr(a: Args, name: string): string | undefined {
  const v = a.flags[name];
  return typeof v === "string" ? v : undefined;
}

export function flagNum(a: Args, name: string): number | undefined {
  const v = flagStr(a, name);
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${name} expects a number, got "${v}"`);
  return n;
}

export function flagBool(a: Args, name: string): boolean {
  const v = a.flags[name];
  return v === true || v === "true" || v === "1";
}

/** Comma-separated list of numbers (`--at 1.2,3,4.5`). */
export function flagNums(a: Args, name: string): number[] | undefined {
  const v = flagStr(a, name);
  if (!v) return undefined;
  return v.split(",").map((s) => {
    const n = Number(s.trim());
    if (!Number.isFinite(n)) throw new Error(`--${name}: "${s}" is not a number`);
    return n;
  });
}

export class UsageError extends Error {}

/** A project is one folder name: it is joined onto the projects, build and state dirs, and the build dir is deleted and rewritten. */
const PROJECT_NAME = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
/** A scene id as the storyboard allows it. */
const SCENE_ID = /^[a-z0-9][a-z0-9-]*$/;

export function requireSlug(a: Args): string {
  const given = a._[0];
  if (!given) throw new UsageError("missing <project> argument");
  const slug = given.replace(/^projects\//, "").replace(/\/$/, "");
  if (!PROJECT_NAME.test(slug)) throw new UsageError(`"${given}" is not a project name (one folder under the projects dir: letters, digits, "-", "_" and ".")`);
  return slug;
}

/** `--scene <id>`: undefined when absent; a usage error when it has no value or is not a scene id. */
export function sceneFlag(a: Args): string | undefined {
  const v = a.flags.scene;
  if (v === undefined) return undefined;
  if (typeof v !== "string" || !SCENE_ID.test(v)) throw new UsageError(`--scene needs a scene id from the storyboard (lowercase letters, digits and "-")`);
  return v;
}
