import { tmpdir } from "node:os";
import { dirname, join, parse } from "node:path";
import { describe, expect, it } from "vitest";
import { assertDisposable } from "../src/build/build.js";
import { parseArgs, requireSlug, sceneFlag, UsageError } from "../src/cli/lib/args.js";
import { BUILD_DIR, PROJECTS_DIR, WORK_ROOT, buildDir, projectDir } from "../src/paths.js";

const args = (...argv: string[]) => parseArgs(argv);

describe("requireSlug", () => {
  it("accepts one project folder name, with or without the projects/ prefix", () => {
    const cases: Array<[string, string]> = [
      ["demo", "demo"],
      ["_defects-layout", "_defects-layout"],
      ["projects/demo/", "demo"],
      ["bench-saas-feature-202611040950", "bench-saas-feature-202611040950"],
      ["My_Video.v2", "My_Video.v2"],
    ];
    for (const [given, slug] of cases) expect(requireSlug(args(given)), given).toBe(slug);
  });

  it("rejects anything that is not one folder name", () => {
    for (const bad of ["../x", "a/b", "..", ".", "./demo", ".hidden", "-x", "demo~hook", "demo@3", "x/../../..", "projects/../..", " demo"]) {
      expect(() => requireSlug(args(bad)), bad).toThrow(UsageError);
    }
    expect(() => requireSlug(args())).toThrow(UsageError);
  });
});

describe("sceneFlag", () => {
  it("returns the scene id, or undefined when the flag is absent", () => {
    expect(sceneFlag(args("demo", "--scene", "hook"))).toBe("hook");
    expect(sceneFlag(args("demo", "--scene=end-card"))).toBe("end-card");
    expect(sceneFlag(args("demo"))).toBeUndefined();
  });

  it("rejects a value that is not a scene id, and a flag with no value", () => {
    for (const bad of ["x/../..", "../..", "Hook", "a b", "-x", ""]) {
      expect(() => sceneFlag(args("demo", `--scene=${bad}`)), bad).toThrow(UsageError);
    }
    expect(() => sceneFlag(args("demo", "--scene"))).toThrow(UsageError);
  });
});

describe("assertDisposable (the build's delete guard)", () => {
  const src = projectDir("demo");

  it("accepts the build dirs the CLI uses, and a temp dir", () => {
    for (const dir of [buildDir("demo"), buildDir("demo~hook"), join(BUILD_DIR, "demo@3"), join(tmpdir(), "ct-golden-x")]) {
      expect(() => assertDisposable(dir, src), dir).not.toThrow();
    }
  });

  it("refuses the repo, its parents, the projects dir, the build dir and the project's sources", () => {
    for (const dir of [WORK_ROOT, dirname(WORK_ROOT), parse(WORK_ROOT).root, PROJECTS_DIR, BUILD_DIR, src, join(src, "scenes")]) {
      expect(() => assertDisposable(dir, src), dir).toThrow(/refusing to build into/);
    }
  });
});
