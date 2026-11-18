import { describe, expect, it } from "vitest";
import { MotionBuilder } from "../src/motion/dsl.js";

describe("time references whose id ends in a number", () => {
  it('"after:card-2" follows the element card-2, not card minus 2 seconds', () => {
    const m = new MotionBuilder("s", 8, {});
    m.enter("card", "fade", { at: 0.5 });
    m.enter("card-2", "fade", { at: 3 });
    expect(m.time("after:card-2")).toBe(m.endOf("card-2"));
    expect(m.time("after:card-2+0.1")).toBeCloseTo(m.endOf("card-2") + 0.1, 3);
    expect(m.time("after:card")).toBe(m.endOf("card"));
  });

  it("a beat named drop-2 is that beat", () => {
    const m = new MotionBuilder("s", 8, { drop: 5, "drop-2": 1 });
    expect(m.time("drop-2")).toBe(1);
    expect(m.time("drop")).toBe(5);
    expect(m.time("drop-2+0.5")).toBe(1.5);
  });

  it("an offset still works where no such id exists", () => {
    const m = new MotionBuilder("s", 8, { b1: 2 });
    m.enter("card", "fade", { at: 0.5 });
    expect(m.time("b1-0.5")).toBe(1.5);
    expect(m.time("end-0.5")).toBe(7.5);
    expect(m.time("after:card-0.1")).toBeCloseTo(m.endOf("card") - 0.1, 3);
  });

  it("still explains a reference to nothing", () => {
    const m = new MotionBuilder("s", 8, { b1: 2 });
    expect(() => m.time("after:row-1")).toThrow(/no motion declared on "row-1"|no motion declared on "row"/);
    expect(() => m.time("nope")).toThrow(/Unknown beat "nope"/);
  });
});
