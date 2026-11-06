import { afterAll, describe, expect, it } from "vitest";
import { buildProject } from "../src/build/build.js";
import { auditTimes, FIELD_EVERY, fieldTimes } from "../src/cli/lib/times.js";
import { greyOnFieldFilm, removeFixtureProjects } from "./fixtures/field-scenes.js";

describe("contrast over a moving field (docs/decisions/0011)", () => {
  afterAll(removeFixtureProjects);

  it("a field scene is sampled through its length, however long the film; other scenes are not", async () => {
    const b = await buildProject("grey-field", { write: false, srcDir: greyOnFieldFilm(30) });
    expect(b.fields).toEqual(["field"]);
    const field = b.timeline!.scenes.find((s) => s.scene === "field")!;
    const times = fieldTimes(b);
    expect(times.length).toBe(field.duration / FIELD_EVERY);
    for (const t of times) expect(t >= field.start && t < field.start + field.duration).toBe(true);
    // The layout audit's sampling is unchanged: capped, a sample or two in the field scene.
    expect(auditTimes(b)).toHaveLength(40);
    expect(fieldTimes({ ...b, fields: [] })).toEqual([]);
  });
});
