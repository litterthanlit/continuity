import { afterAll, describe, expect, it } from "vitest";
import { buildProject } from "../src/build/build.js";
import { join } from "node:path";
import { lintTimeline } from "../src/lint/timeline.js";
import type { Tween } from "../src/motion/types.js";
import { PKG_ROOT } from "../src/paths.js";
import { fieldScenes, layeredFilm, removeFixtureProjects } from "./fixtures/field-scenes.js";
import { compileScene, sampleScene, styleOf } from "../src/motion/evaluate.js";

/** Projects that live outside projects/ (shipped with the package). */
const SRC: Record<string, string> = { _template: join(PKG_ROOT, "templates", "project") };

async function rules(slug: string) {
  const b = await buildProject(slug, { write: false, srcDir: SRC[slug] });
  const findings = [...b.findings, ...lintTimeline(b)];
  return { b, findings, ids: new Set(findings.map((f) => `${f.source}:${f.rule}`)) };
}

describe("seeded static defects (projects/_defects)", () => {
  it("every seeded lint/build rule fires", async () => {
    const { ids } = await rules("_defects");
    for (const r of [
      "build:glyph-missing",
      "build:target-missing",
      "build:text-missing",
      "lint:ease-linear",
      "lint:settle-interrupted",
      "lint:read-time",
      "lint:unstaggered-group",
      "lint:scene-overrun",
      "lint:late-entrance",
      "lint:slow-open",
      "lint:dead-air",
      "lint:axis-reflow",
      "lint:axis-unsupported",
      "lint:axis-range",
      "lint:weight-role",
      "lint:transition-too-long",
      "lint:transition-too-short",
      "lint:transition-language",
      "lint:transition-bounce",
      "lint:transition-strobe",
      // litt (docs/decisions/0006)
      "lint:spring-bounce",
      "lint:exit-bounce",
      "lint:expressive-budget",
      "lint:material-motion",
      "lint:property-motion",
      "lint:travel-too-far",
      "lint:camera-drift",
      "lint:ambient-loop",
      // registers (docs/decisions/0007)
      "lint:transition-register",
      "lint:text-fade",
      "lint:ease-register",
    ]) {
      expect(ids, r).toContain(r);
    }
  });
});

describe("good projects stay clean (no false positives)", () => {
  for (const slug of ["example-type", "_kit", "_smoke", "_template", "_type", "_transitions", "_energetic", "_launch"]) {
    it(slug, async () => {
      const { findings } = await rules(slug);
      const errors = findings.filter((f) => f.severity === "error");
      expect(errors.map((e) => `${e.rule}: ${e.message}`)).toEqual([]);
    });
  }
});

describe("build output", () => {
  it("is deterministic for identical sources", async () => {
    const a = await buildProject("_smoke", { write: false });
    const b = await buildProject("_smoke", { write: false });
    expect(JSON.stringify(a.timeline)).toEqual(JSON.stringify(b.timeline));
    expect(a.hash).toEqual(b.hash);
  });

  it("marks split targets and records elements", async () => {
    const b = await buildProject("example-type", { write: false });
    const l1 = b.elements.find((e) => e.id === "hook.l1");
    expect(l1?.split).toBe("lines");
    expect(b.timeline!.scenes.map((s) => s.scene)).toEqual(["hook", "write", "blind", "eyes", "check", "end"]);
  });

  it("builds one scene of a film with a morph alone (its neighbours are placeholders)", async () => {
    for (const only of ["cards", "stat", "type"]) {
      const b = await buildProject("example-beat", { write: false, only });
      expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
      expect(b.ok).toBe(true);
    }
  });
});

describe("registers (docs/decisions/0007)", () => {
  it("the energetic gallery is clean of warnings; the same motion judged calm trips litt's bounds", async () => {
    const { b, findings } = await rules("_energetic");
    expect(findings.filter((f) => f.severity !== "info").map((f) => `${f.rule}: ${f.message}`)).toEqual([]);
    const calm = lintTimeline({ ...b, storyboard: { ...b.storyboard!, register: "calm" } });
    const ids = new Set(calm.map((f) => f.rule));
    for (const r of ["spring-bounce", "travel-too-far", "expressive-budget", "camera-drift", "transition-register"]) expect(ids, r).toContain(r);
  });

  it("a scene's own register wins over the storyboard's", async () => {
    const { b } = await rules("_energetic");
    const sb = b.storyboard!;
    const scenes = sb.scenes.map((s) => (s.id === "collage" ? { ...s, register: "calm" as const } : s));
    const found = lintTimeline({ ...b, storyboard: { ...sb, scenes } }).filter((f) => f.rule === "spring-bounce");
    expect(found.length).toBeGreaterThan(0);
    expect(new Set(found.map((f) => f.scene))).toEqual(new Set(["collage"]));
  });
});

describe("launch devices (projects/_launch)", () => {
  /** The gallery with every tween on `target` from the first that `from` picks (in time order) moved earlier by `by` seconds. */
  async function rushed(target: string, from: number | ((t: Tween) => boolean), by: number) {
    const { b } = await rules("_launch");
    const scenes = b.timeline!.scenes.map((sc) => {
      const mine = sc.tweens.filter((t) => t.target === target).sort((x, y) => x.start - y.start);
      const first = typeof from === "number" ? mine[from] : mine.find(from);
      const cut = first ? first.start : Infinity;
      return { ...sc, tweens: sc.tweens.map((t) => (t.target === target && t.start >= cut ? { ...t, start: Math.max(0, t.start - by) } : t)) };
    });
    return lintTimeline({ ...b, timeline: { ...b.timeline!, scenes } });
  }

  it("retype-hold fires when a claim is deleted before it can be read", async () => {
    // From the deletion of "ranking #1" (keys 10 → 20) on, everything comes 0.9s early.
    const found = (await rushed("value.end", (t) => t.props.typed?.[0] === 10 && t.props.typed?.[1] === 20, 0.9)).filter((f) => f.rule === "retype-hold");
    expect(found.map((f) => f.message)).toEqual([expect.stringContaining('"ranking #1"')]);
  });

  it("cycle-glance fires when a word flips away almost as soon as it lands", async () => {
    const found = (await rushed("intro.tool-1", 1, 0.4)).filter((f) => f.rule === "cycle-glance");
    expect(found.map((f) => f.element)).toEqual(["intro.tool-1"]);
  });

  it("camera-edge fires when a pan outruns its zoom and shows the scene's edge", async () => {
    const { b } = await rules("_launch");
    const scenes = b.timeline!.scenes.map((sc) => ({
      ...sc,
      tweens: sc.tweens.map((t) => (sc.scene === "product" && t.kind === "camera" && t.start > 1 ? { ...t, props: { ...t.props, y: [0, 200] as [number, number] } } : t)),
    }));
    const found = lintTimeline({ ...b, timeline: { ...b.timeline!, scenes } }).filter((f) => f.rule === "camera-edge");
    expect(found.map((f) => f.scene)).toEqual(["product"]);
    expect(lintTimeline(b).filter((f) => f.rule === "camera-edge")).toEqual([]);
  });

  it("dead-air: an energetic hold past 1.6s warns; the same hold judged calm is an info", async () => {
    const { b } = await rules("_launch");
    // Drop the last two notifications: the scene then stands still for about two seconds.
    const scenes = b.timeline!.scenes.map((sc) => (sc.scene === "alerts" ? { ...sc, tweens: sc.tweens.filter((t) => t.start < 1.4), loops: [] } : sc));
    const still = { ...b, timeline: { ...b.timeline!, scenes } };
    const found = (bb: typeof b) => lintTimeline(bb).filter((f) => f.rule === "dead-air" && f.scene === "alerts").map((f) => f.severity);
    expect(found(still)).toEqual(["warning"]);
    expect(found({ ...still, storyboard: { ...still.storyboard!, register: "calm" } })).toEqual(["info"]);
  });

  it("the stack's arrivals travel one row without tripping travel-too-far, even judged calm", async () => {
    const { b } = await rules("_launch");
    const calm = lintTimeline({ ...b, storyboard: { ...b.storyboard!, register: "calm" } });
    expect(calm.filter((f) => f.rule === "travel-too-far" && f.element?.startsWith("alerts.alerts-"))).toEqual([]);
  });
});

describe("flow across the joins (docs/decisions/0010)", () => {
  type Shape = { enter?: number; settle?: number };
  /** Four 2s scenes; each one's single tween enters at `enter` and settles at `settle`. */
  const film = (sides: Shape[], transition?: { type: "crossfade"; duration: number }) =>
    ({
      ok: true,
      slug: "t",
      dir: "",
      elements: [],
      partsEstimate: {},
      fields: [],
      findings: [],
      hash: "",
      storyboard: {
        title: "t",
        format: { aspect: "16:9", fps: 30 },
        scenes: sides.map((_, i) => ({ id: `s${i}`, duration: 2, intent: "one", ...(transition && i < sides.length - 1 ? { transition } : {}) })),
      },
      timeline: {
        version: 1,
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 2 * sides.length,
        scenes: sides.map((s, i) => ({
          scene: `s${i}`,
          start: 2 * i,
          duration: 2,
          beats: {},
          loops: [],
          tweens: [
            { target: `s${i}.camera`, kind: "camera", start: 0, duration: 2, ease: { type: "linear" }, props: { scale: [1, 1.03] } },
            { target: `s${i}.a`, kind: "enter", start: s.enter ?? 0, duration: (s.settle ?? 1) - (s.enter ?? 0), ease: { type: "linear" }, props: { opacity: [0, 1] } },
          ],
        })),
      },
    }) as unknown as Parameters<typeof lintTimeline>[0];
  const count = (b: Parameters<typeof lintTimeline>[0], rule: string) => lintTimeline(b).filter((f) => f.rule === rule).length;

  it("a cut between two rests is dead; a camera push does not carry it, an entrance on the cut does", () => {
    const rest = { enter: 0.5, settle: 1 };
    expect(count(film([rest, rest]), "dead-cut")).toBe(1);
    expect(count(film([rest, { enter: 0, settle: 1 }]), "dead-cut")).toBe(0);
    expect(count(film([{ enter: 1.2, settle: 1.9 }, rest]), "dead-cut")).toBe(0);
  });
  it("a film whose joins mostly carry nothing is a slideshow", () => {
    const rest = { enter: 0.5, settle: 1 };
    expect(count(film([rest, rest, rest, rest]), "static-edit")).toBe(1);
    expect(count(film([{ enter: 0 }, { enter: 0 }, { enter: 0 }, { enter: 0 }], { type: "crossfade", duration: 0.4 }), "static-edit")).toBe(1);
    expect(count(film([{ enter: 0 }, { enter: 0 }, { enter: 0 }, { enter: 0 }]), "static-edit")).toBe(0);
  });
});

describe("WebGL contexts (docs/decisions/0011)", () => {
  afterAll(removeFixtureProjects);
  it("more canvases than Chrome keeps contexts for is a build error; at the cap it builds", async () => {
    const over = await buildProject("fields", { write: false, srcDir: fieldScenes(17) });
    const f = over.findings.find((x) => x.rule === "webgl-contexts");
    expect(f?.severity).toBe("error");
    expect(f?.message).toMatch(/17 WebGL canvases \(0 GL shots, 17 gradient fields\).*16 per page.*0011/);
    const at = await buildProject("fields", { write: false, srcDir: fieldScenes(16) });
    expect(at.findings.filter((x) => x.severity === "error")).toEqual([]);
  });
});

describe("layered handoffs (build)", () => {
  afterAll(removeFixtureProjects);
  const shifts = (b: Awaited<ReturnType<typeof buildProject>>) =>
    b.timeline!.scenes.flatMap((s) => s.tweens).filter((tw) => "props" in tw && (tw.props.shiftX || tw.props.shiftY)) as Tween[];

  it("only top-level elements take the handoff", async () => {
    const b = await buildProject("layered", { write: false, srcDir: layeredFilm() });
    expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
    const targets = new Set(shifts(b).map((tw) => tw.target));
    expect(targets).toEqual(new Set(["a.h", "a.panel", "b.h", "b.panel"]));
    // _flow's carry from detail to next is layered: the copy and the chart both ride it.
    const flow = await buildProject("_flow", { write: false });
    const flowTargets = new Set(shifts(flow).map((tw) => tw.target));
    for (const id of ["detail.title", "detail.bars", "next.title", "next.bars"]) expect(flowTargets).toContain(id);
  });

  it("a layered handoff composes with the element's own entrance", async () => {
    const b = await buildProject("layered", { write: false, srcDir: layeredFilm() });
    const sc = b.timeline!.scenes.find((s) => s.scene === "b")!;
    const v = sampleScene(compileScene(sc, b.partsEstimate), 0.1).get("b.h")!;
    expect(Math.abs(v.y ?? 0)).toBeGreaterThan(0.5);
    expect(Math.abs(v.shiftX ?? 0)).toBeGreaterThan(0.5);
    const m = /translate3d\(([-\d.]+)px,([-\d.]+)px/.exec(styleOf(v).transform!)!;
    expect(Number(m[1])).toBeCloseTo((v.x ?? 0) + v.shiftX!, 3);
    expect(Number(m[2])).toBeCloseTo(v.y!, 3);
  });

  it("built alone, a layered join degrades to the plain move", async () => {
    const b = await buildProject("_flow", { write: false, only: "next" });
    expect(b.findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(shifts(b)).toEqual([]);
  });
});
