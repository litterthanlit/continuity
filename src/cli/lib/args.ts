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

export function requireSlug(a: Args): string {
  const slug = a._[0];
  if (!slug) throw new UsageError("missing <project> argument");
  return slug.replace(/^projects\//, "").replace(/\/$/, "");
}
