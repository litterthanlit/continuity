import { describe, expect, it } from "vitest";
import { parseEnergy } from "../src/cli/lib/energy.js";

describe("parseEnergy", () => {
  it("keeps the exponent of near-still frames", () => {
    const text = [
      "frame:0    pts:512     pts_time:0.0333333",
      "lavfi.signalstats.YAVG=0.00256944",
      "frame:1    pts:1024    pts_time:0.0666667",
      "lavfi.signalstats.YAVG=5.20833e-05",
      "frame:2    pts:1536    pts_time:0.1",
      "lavfi.signalstats.YAVG=4.40278",
    ].join("\n");
    const points = parseEnergy(text);
    expect(points).toHaveLength(3);
    expect(points[0]).toEqual([0.0333333, 0.00256944]);
    expect(points[1][1]).toBeCloseTo(5.20833e-5, 10);
    expect(points[2]).toEqual([0.1, 4.40278]);
  });
});
