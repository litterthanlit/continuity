import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const json = (p: string) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

describe("distribution", () => {
  const pkg = json("package.json");
  const plugin = json("plugin/.claude-plugin/plugin.json");
  const market = json(".claude-plugin/marketplace.json");

  it("plugin and package versions move together", () => {
    expect(plugin.version).toBe(pkg.version);
  });

  it("the marketplace lists the plugin from ./plugin under the same name", () => {
    expect(market.plugins).toEqual([expect.objectContaining({ name: plugin.name, source: "./plugin" })]);
  });

  it("publishes the CLI and engine, with the render engine as a pinned runtime dependency", () => {
    expect(pkg.bin.ct).toBe("bin/ct.mjs");
    expect(pkg.files).toEqual(expect.arrayContaining(["bin", "src", "templates"]));
    expect(pkg.dependencies.hyperframes).toMatch(/^\d+\.\d+\.\d+$/);
    for (const v of Object.values<string>(pkg.dependencies)) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
