import { describe, expect, it } from "vitest";
import { cx } from "../src/kit/core.js";

describe("cx class merge", () => {
  it("later classes win within a group", () => {
    expect(cx("font-mono text-micro text-subtle", "text-accent")).toBe("font-mono text-micro text-accent");
    expect(cx("text-h1 text-fg", "text-[140px]")).toBe("text-fg text-[140px]");
    expect(cx("tracking-[0.18em] uppercase", "tracking-tight normal-case")).toBe("tracking-tight normal-case");
  });
  it("keeps unrelated and variant-scoped classes", () => {
    expect(cx("text-center text-fg", "text-balance")).toBe("text-center text-fg text-balance");
    expect(cx("text-fg md:text-muted", "text-accent")).toBe("md:text-muted text-accent");
    expect(cx("a", false, undefined, "b")).toBe("a b");
  });
});
