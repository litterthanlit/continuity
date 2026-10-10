import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseHTML } from "linkedom";
import { renderToString } from "preact-render-to-string";
import type { SceneDefinition } from "../index.js";
import { drainMissingText, textProxy, withScene, type SceneContext } from "../kit/context.js";
import { MotionBuilder } from "../motion/dsl.js";
import { splitModes } from "../motion/evaluate.js";
import { TRANSITION_DEFS, transitionTweens } from "../motion/transitions.js";
import type { PartCounts, PropName, SceneTimeline, SplitMode, Timeline } from "../motion/types.js";
import { BUILD_DIR, PKG_ROOT, PROJECTS_DIR, buildDir, projectDir, rel, resolveDep } from "../paths.js";
import type { Finding } from "../spec/findings.js";
import { ASPECTS, beatsOf, parseStoryboard, sceneTimings, type Storyboard } from "../spec/storyboard.js";
import { getTheme, type Theme } from "../themes/index.js";
import { resolveKit, getKit, type TypeKit } from "../themes/kits.js";
import { buildFamilies, classCandidates, compileCss, fontFaceCss, fontLoadList } from "./css.js";
import { FONT_CHANNELS, typeBaseOf } from "./typebase.js";
import { missingGlyphs } from "./glyphs.js";
import { sourceHash } from "./hash.js";
import { runtimeBundle } from "./runtime-bundle.js";

export interface ElementInfo {
  id: string;
  scene: string;
  tag: string;
  /** Full visible text (collapsed whitespace). */
  text: string;
  /** Text that belongs to this element rather than to animated descendants. */
  ownText: string;
  role?: string;
  split?: SplitMode;
  /** Decorative (data-layout-ignore) — skipped by text rules. */
  decor: boolean;
  /** Animatable ancestors (nearest first), whose motion also moves/hides this element. */
  ancestors: string[];
  /** Inside a UI-kit mockup (window, card, code…): text is imagery to glance at, not copy to read. */
  ui: boolean;
  /** The face it is drawn in (role, family, axis ranges) — for the axis lint rules. */
  font?: { role: string; family: string; category: string; ranges: Partial<Record<PropName, [number, number]>>; nowrap: boolean };
}

export interface BuildResult {
  ok: boolean;
  slug: string;
  dir: string;
  storyboard?: Storyboard;
  theme?: Theme;
  /** The video's type kit (scenes may override it with their own `type`). */
  typeKit?: TypeKit;
  timeline?: Timeline;
  elements: ElementInfo[];
  partsEstimate: PartCounts;
  findings: Finding[];
  hash: string;
}

/** Element ids the build itself owns: the scene root, its camera and transition layers. */
const RESERVED = new Set(["scene", "camera", "reveal", "fx"]);
const OWN_LAYER = /\b(ct-scene|ct-camera|ct-reveal|ct-fx)\b/;

export function loadStoryboard(slug: string, srcDir = projectDir(slug)): { storyboard?: Storyboard; findings: Finding[] } {
  const file = join(srcDir, "storyboard.json");
  if (!existsSync(file)) {
    return { findings: [{ source: "schema", rule: "storyboard-missing", severity: "error", message: `projects/${slug}/storyboard.json not found` }] };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return { findings: [{ source: "schema", rule: "storyboard-json", severity: "error", message: `storyboard.json is not valid JSON: ${(e as Error).message}` }] };
  }
  const parsed = parseStoryboard(raw);
  if (!parsed.ok) {
    return {
      findings: parsed.issues.map((m) => ({ source: "schema" as const, rule: "storyboard", severity: "error" as const, message: m })),
    };
  }
  return { storyboard: parsed.value, findings: [] };
}

/** `export default` of a user module; unwraps the double default a CommonJS-compiled module yields. */
function defaultExport<T>(mod: { default?: unknown }): T | undefined {
  const d = mod.default as { default?: unknown; __esModule?: boolean } | undefined;
  return (d && typeof d === "object" && "default" in d && !("view" in d) && !("colors" in d) ? d.default : d) as T | undefined;
}

async function loadTheme(srcDir: string, name: string): Promise<Theme> {
  const file = join(srcDir, "theme.ts");
  if (existsSync(file)) {
    const theme = defaultExport<Theme>(await import(pathToFileURL(file).href));
    if (theme) return theme;
  }
  return getTheme(name);
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

function fontInfo(el: unknown, kit: TypeKit): NonNullable<ElementInfo["font"]> {
  const b = typeBaseOf(el as Parameters<typeof typeBaseOf>[0], kit);
  return { role: b.role, family: b.family.family, category: b.family.category, ranges: b.ranges, nowrap: b.nowrap };
}

function graphemeCount(s: string): number {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  let n = 0;
  for (const g of seg.segment(s)) if (!/\s/.test(g.segment)) n++;
  return n;
}

/** Part counts for a split element, estimated from its rendered HTML (lines are a heuristic). */
export function estimateParts(node: Element): { chars: number; words: number; lines: number } {
  const text = collapse(node.textContent ?? "");
  const words = text ? text.split(" ").length : 0;
  const brs = (node.querySelectorAll("br") as unknown as unknown[]).length;
  return { chars: graphemeCount(text), words, lines: Math.max(1, brs + 1, Math.min(4, Math.round(words / 4))) };
}

function errMsg(e: unknown): string {
  const err = e as Error;
  const firstFrame = err.stack?.split("\n").find((l) => l.includes(PROJECTS_DIR))?.trim();
  if (!firstFrame) return err.message;
  const where = firstFrame.replace(/^at\s+/, "").replace(/\(?(?:file:\/\/)?(\/[^:)]+)/, (_, p: string) => rel(p));
  return `${err.message} (${where.replace(/\)$/, "")})`;
}

/**
 * Compile a project (storyboard + scene files + theme) into a plain HyperFrames
 * composition under build/<slug>/. Pure-code in, deterministic HTML out.
 */
export async function buildProject(
  slug: string,
  opts: {
    write?: boolean;
    srcDir?: string;
    outDir?: string;
    /** Build only this scene; the others become timed placeholders (isolates parallel scene-builders). */
    only?: string;
  } = {},
): Promise<BuildResult> {
  const write = opts.write ?? true;
  const src = opts.srcDir ?? projectDir(slug);
  const dir = opts.outDir ?? buildDir(slug);
  const findings: Finding[] = [];
  const hash = sourceHash(slug, src).combined;
  const empty = { ok: false, slug, dir, elements: [], partsEstimate: {}, hash };
  if (!existsSync(src)) {
    return { ...empty, findings: [{ source: "build", rule: "project-missing", severity: "error", message: `${rel(src)} does not exist (try: npx ct new ${slug})` }] };
  }

  const { storyboard: sb, findings: sbFindings } = loadStoryboard(slug, src);
  findings.push(...sbFindings);
  if (!sb) return { ...empty, findings };

  let theme: Theme;
  let kit: TypeKit;
  try {
    theme = await loadTheme(src, sb.theme);
    kit = resolveKit(theme, sb.type);
  } catch (e) {
    findings.push({ source: "build", rule: "theme", severity: "error", message: errMsg(e) });
    return { ...empty, storyboard: sb, findings };
  }
  const themeKit = typeof theme.type === "string" ? theme.type : theme.type?.name;
  if (sb.type && themeKit && sb.type !== themeKit) {
    findings.push({
      source: "build",
      rule: "type-conflict",
      severity: "info",
      message: `storyboard type "${sb.type}" overrides the "${themeKit}" kit set in theme.ts`,
    });
  }
  // Per-scene kit overrides (scoped CSS under [data-ct-type]); the same kit as the video's is no override.
  const sceneKit = new Map<string, TypeKit>();
  for (const sc of sb.scenes) if (sc.type && sc.type !== kit.name) sceneKit.set(sc.id, getKit(sc.type));
  const sceneKits = [...new Map([...sceneKit.values()].map((k) => [k.name, k])).values()];

  const { width, height } = ASPECTS[sb.format.aspect];
  const timings = sceneTimings(sb);
  const scenes = new Map<string, SceneTimeline>();
  const sections: string[] = [];
  drainMissingText();

  for (const [index, sc] of sb.scenes.entries()) {
    const timing = timings.scenes[index];
    const file = join(src, "scenes", `${sc.id}.tsx`);
    const beats = beatsOf(sc);
    const tl: SceneTimeline = { scene: sc.id, start: timing.start, duration: sc.duration, beats, tweens: [], loops: [] };
    scenes.set(sc.id, tl);
    let inner = `<div class="absolute inset-0 grid place-items-center text-h3 text-danger">missing scene ${sc.id}</div>`;
    if (opts.only && opts.only !== sc.id) {
      inner = `<div class="absolute inset-0 bg-bg"></div>`;
    } else if (!existsSync(file)) {
      findings.push({ source: "build", rule: "scene-missing", severity: "error", scene: sc.id, message: `scenes/${sc.id}.tsx not found in ${rel(src)}` });
    } else {
      let def: SceneDefinition | undefined;
      try {
        def = defaultExport<SceneDefinition>(await import(pathToFileURL(file).href));
      } catch (e) {
        const msg = errMsg(e);
        const cjs = /require\(\)|ERR_REQUIRE|exports is not defined/.test(msg);
        findings.push({
          source: "build",
          rule: "scene-import",
          severity: "error",
          scene: sc.id,
          message: msg,
          ...(cjs ? { suggestion: `scene files must load as ES modules: add ${rel(join(PROJECTS_DIR, "package.json"))} with {"type":"module"} (npx ct init does this)` } : {}),
        });
      }
      if (def && typeof def.view !== "function") {
        findings.push({ source: "build", rule: "scene-export", severity: "error", scene: sc.id, message: `scenes/${sc.id}.tsx must \`export default scene({ view, motion })\`` });
        def = undefined;
      }
      if (def) {
        const ctx: SceneContext = {
          id: sc.id,
          text: textProxy(sc.id, sc.text),
          aspect: sb.format.aspect,
          width,
          height,
          portrait: height > width,
          landscape: width > height,
          square: width === height,
          theme,
          typeKit: sceneKit.get(sc.id) ?? kit,
          beats,
          duration: sc.duration,
          index,
          total: sb.scenes.length,
        };
        try {
          inner = withScene(ctx, () => renderToString(def!.view(ctx)));
        } catch (e) {
          findings.push({ source: "build", rule: "view", severity: "error", scene: sc.id, message: `view failed: ${errMsg(e)}` });
        }
        if (def.motion) {
          const viewDoc = parseHTML(`<!doctype html><html><body>${inner}</body></html>`).document;
          const partsOf = (target: string, mode: SplitMode) => {
            const node = viewDoc.querySelector(`[data-ct="${target}"]`);
            return node ? estimateParts(node as unknown as Element)[mode] : undefined;
          };
          const baseOf = (target: string) => {
            const node = viewDoc.querySelector(`[data-ct="${target}"]`);
            return node ? typeBaseOf(node as unknown as Parameters<typeof typeBaseOf>[0], ctx.typeKit) : undefined;
          };
          const mb = new MotionBuilder(sc.id, sc.duration, beats, partsOf, baseOf);
          try {
            def.motion(mb, ctx);
          } catch (e) {
            findings.push({ source: "build", rule: "motion", severity: "error", scene: sc.id, message: errMsg(e) });
          }
          tl.tweens.push(...mb.tweens);
          tl.loops.push(...mb.loops);
          // Font channels start from the element's settled face, not from neutral values.
          for (const t of [...mb.tweens, ...mb.loops]) {
            const props = "props" in t ? Object.keys(t.props) : [t.prop];
            const font = props.filter((p) => p in FONT_CHANNELS) as PropName[];
            if (!font.length) continue;
            const b = baseOf(t.target);
            if (!b) continue;
            tl.bases ??= {};
            const entry = (tl.bases[t.target] ??= {});
            for (const p of font) entry[p] = b.values[p];
          }
        }
      }
    }
    // Layers the incoming transition needs: a reveal wrapper (mask) and/or an overlay above the scene.
    const incoming = index > 0 ? sb.scenes[index - 1].transition : undefined;
    const layers = incoming ? TRANSITION_DEFS[incoming.type].layers : undefined;
    let body = `<div class="ct-camera" data-ct="${sc.id}.camera" data-layout-allow-overflow>${inner}</div>`;
    if (layers?.reveal) body = `<div class="ct-reveal" data-ct="${sc.id}.reveal" data-layout-allow-overflow style="position:absolute;inset:0">${body}</div>`;
    if (incoming && layers?.fx) {
      const fx = layers.fx(incoming);
      body += `<div class="ct-fx" data-ct="${sc.id}.fx" data-layout-ignore aria-hidden="true" style="${fx.style}">${fx.inner}</div>`;
    }
    sections.push(
      `<section id="sc-${sc.id}" class="clip ct-scene" data-ct-scene="${sc.id}" data-ct="${sc.id}.scene" ` +
        (sceneKit.has(sc.id) ? `data-ct-type="${sceneKit.get(sc.id)!.name}" ` : "") +
        `data-start="${timing.start}" data-duration="${sc.duration}" data-layout-allow-overflow style="z-index:${index + 1}">` +
        `${body}</section>`,
    );
  }

  if (opts.only && !sb.scenes.some((s) => s.id === opts.only)) {
    findings.push({ source: "build", rule: "scene-unknown", severity: "error", message: `no scene "${opts.only}" in the storyboard` });
  }

  // Scene transitions become tweens on the scene roots.
  sb.scenes.forEach((sc, i) => {
    if (!sc.transition || i === sb.scenes.length - 1) return;
    const next = sb.scenes[i + 1];
    const t = transitionTweens(sc.transition, { id: sc.id, duration: sc.duration }, { id: next.id }, { width, height, fps: sb.format.fps });
    scenes.get(sc.id)!.tweens.push(...t.out);
    scenes.get(next.id)!.tweens.unshift(...t.in);
  });

  for (const key of drainMissingText()) {
    const [scene, el] = key.split(".");
    findings.push({
      source: "build",
      rule: "text-missing",
      severity: "error",
      scene,
      element: key,
      message: `view reads text.${el} but the storyboard scene "${scene}" has no text.${el}`,
      suggestion: `add "${el}": "…" to scenes[${scene}].text in storyboard.json`,
    });
  }

  const timeline: Timeline = {
    version: 1,
    fps: sb.format.fps,
    width,
    height,
    duration: timings.duration,
    scenes: sb.scenes.map((s) => scenes.get(s.id)!),
  };

  // ---- DOM post-processing: element registry, split markers, target validation.
  const rootHtml =
    `<div id="root" data-composition-id="root" data-width="${width}" data-height="${height}" data-fps="${sb.format.fps}" ` +
    `data-start="0" data-duration="${timings.duration}" data-no-timeline style="width:${width}px;height:${height}px">` +
    sections.join("\n") +
    `</div>`;
  const { document } = parseHTML(`<!doctype html><html><head></head><body>${rootHtml}</body></html>`);
  const roleOf = new Map<string, string>();
  for (const s of sb.scenes) for (const e of s.elements) if (e.role) roleOf.set(`${s.id}.${e.id}`, e.role);

  const elements: ElementInfo[] = [];
  const seen = new Map<string, number>();
  const fontTargets = new Set(timeline.scenes.flatMap((sc) => Object.keys(sc.bases ?? {})));
  for (const el of document.querySelectorAll("[data-ct]") as unknown as HTMLElement[]) {
    const id = el.getAttribute("data-ct")!;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    const [scene, local] = [id.slice(0, id.indexOf(".")), id.slice(id.indexOf(".") + 1)];
    if (RESERVED.has(local)) {
      if (!OWN_LAYER.test(el.getAttribute("class") ?? "")) {
        findings.push({ source: "build", rule: "reserved-id", severity: "error", scene, element: id, message: `ct="${local}" is reserved for the scene's own layers (${[...RESERVED].join(", ")})`, suggestion: "rename the element" });
      }
      continue;
    }
    const ancestors: string[] = [];
    for (let p = el.parentElement; p; p = p.parentElement) {
      const pid = p.getAttribute?.("data-ct");
      if (pid) ancestors.push(pid);
    }
    let own = el.textContent ?? "";
    for (const child of el.querySelectorAll("[data-ct]") as unknown as HTMLElement[]) own = own.replace(child.textContent ?? "", " ");
    elements.push({
      id,
      scene,
      tag: el.tagName.toLowerCase(),
      text: collapse(el.textContent ?? ""),
      ownText: collapse(own),
      role: roleOf.get(id),
      decor: el.hasAttribute("data-layout-ignore") || Boolean(el.closest("[data-layout-ignore]")),
      ancestors,
      ui: Boolean(el.closest("[data-ct-ui]")),
      ...(fontTargets.has(id) ? { font: fontInfo(el, sceneKit.get(scene) ?? kit) } : {}),
    });
  }
  for (const [id, n] of seen) {
    if (n > 1) findings.push({ source: "build", rule: "duplicate-ct", severity: "error", element: id, message: `${n} elements share ct="${id}" — ids must be unique within a scene` });
  }

  const byId = new Map(elements.map((e) => [e.id, e]));
  const partsEstimate: PartCounts = {};
  for (const tl of timeline.scenes) {
    for (const t of [...tl.tweens, ...tl.loops]) {
      const local = t.target.slice(t.target.indexOf(".") + 1);
      if (RESERVED.has(local)) continue;
      if (!byId.has(t.target) && !seen.has(t.target)) {
        findings.push({
          source: "build",
          rule: "target-missing",
          severity: "error",
          scene: tl.scene,
          element: t.target,
          message: `motion targets "${local}" but no element in scene "${tl.scene}" has ct="${local}"`,
          suggestion: `add ct="${local}" to the element in scenes/${tl.scene}.tsx, or fix the name`,
        });
      }
    }
    for (const [target, { mode, mask }] of splitModes(tl)) {
      const conflicting = tl.tweens.find((t) => t.target === target && t.split && t.split !== mode);
      if (conflicting) {
        findings.push({ source: "build", rule: "split-conflict", severity: "error", element: target, message: `"${target}" is split as both ${mode} and ${conflicting.split}; use one split mode per element` });
      }
      const node = document.querySelector(`[data-ct="${target}"]`);
      if (!node) continue;
      node.setAttribute("data-ct-split", mode);
      if (mask) node.setAttribute("data-ct-mask", "");
      const info = byId.get(target);
      if (info) info.split = mode;
      partsEstimate[target] = estimateParts(node as unknown as Element);
    }
  }

  // Every visible character must be drawable by a vendored font (determinism).
  for (const sec of document.querySelectorAll("[data-ct-scene]") as unknown as HTMLElement[]) {
    const sceneId = sec.getAttribute("data-ct-scene")!;
    const missing = missingGlyphs(sec.textContent ?? "", buildFamilies([sceneKit.get(sceneId) ?? kit]));
    if (missing.length) {
      findings.push({
        source: "build",
        rule: "glyph-missing",
        severity: "error",
        scene: sceneId,
        message: `no vendored font has a glyph for ${missing.map((c) => `"${c}" (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(", ")} — it would render in a random system font`,
        suggestion: "use a character the theme fonts cover, or draw it as an inline SVG icon",
      });
    }
  }

  const body = document.querySelector("#root")!.outerHTML;
  const ok = !findings.some((f) => f.severity === "error");
  const result: BuildResult = { ok, slug, dir, storyboard: sb, theme, typeKit: kit, timeline, elements, partsEstimate, findings, hash };
  if (!write) return result;

  // ---- Emit the HyperFrames project.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "fonts"), { recursive: true });
  const families = buildFamilies([kit, ...sceneKits]);
  for (const fam of families) {
    for (const face of fam.faces) copyFileSync(resolveDep(face.file), join(dir, "fonts", basename(face.file)));
  }
  const assets = join(src, "assets");
  if (existsSync(assets)) cpSync(assets, join(dir, "assets"), { recursive: true });

  const css = fontFaceCss(families) + "\n" + (await compileCss(theme, kit, sceneKits, classCandidates(body), PKG_ROOT));
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${width}, height=${height}">
<title>${escapeHtml(sb.title)}</title>
<style>
${css}
</style>
</head>
<body>
${body}
<script src="ct-data.js"></script>
<script src="continuity-motion.js"></script>
</body>
</html>
`;
  writeFileSync(join(dir, "index.html"), html);
  writeFileSync(join(dir, "ct-data.js"), `window.__CT__ = ${JSON.stringify({ timeline, fonts: fontLoadList(families) })};\n`);
  writeFileSync(join(dir, "continuity-motion.js"), await runtimeBundle());
  // Not named *.motion.json on purpose: HyperFrames auto-runs sidecars and each
  // assertion costs ~10s of timeline sweeping. `ct check --deep` activates it.
  writeFileSync(join(dir, "motion-assertions.json"), JSON.stringify(motionAssertions(timeline, elements), null, 2) + "\n");
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({ slug, hash, title: sb.title, format: sb.format, width, height, duration: timings.duration, scenes: timings.scenes, elements, partsEstimate }, null, 2) + "\n",
  );
  return result;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * HyperFrames `*.motion.json` sidecar generated from the timeline: every
 * element that fades in on its own must be visible by the end of its entrance,
 * and entrances must land in the declared order.
 */
export function motionAssertions(timeline: Timeline, elements: ElementInfo[]) {
  const known = new Set(elements.map((e) => e.id));
  const assertions: Array<Record<string, unknown>> = [];
  for (const sc of timeline.scenes) {
    const entrances = sc.tweens
      .filter((t) => t.kind === "enter" && !t.split && t.props.opacity && t.props.opacity[0] === 0 && known.has(t.target))
      .map((t) => ({ target: t.target, start: sc.start + t.start, end: sc.start + t.start + t.duration }))
      .sort((a, b) => a.start - b.start);
    const firstByTarget = new Map<string, { start: number; end: number }>();
    for (const e of entrances) if (!firstByTarget.has(e.target)) firstByTarget.set(e.target, e);
    const list = [...firstByTarget.entries()];
    for (const [target, e] of list) {
      const bySec = Math.min(timeline.duration - 1 / timeline.fps, Math.round((e.end + 0.05) * 1000) / 1000);
      assertions.push({ kind: "appearsBy", selector: `[data-ct="${target}"]`, bySec });
    }
    for (let i = 1; i < list.length; i++) {
      const [a, ea] = list[i - 1];
      const [b, eb] = list[i];
      if (eb.start - ea.start >= 0.15) assertions.push({ kind: "before", a: `[data-ct="${a}"]`, b: `[data-ct="${b}"]` });
    }
  }
  return { duration: timeline.duration, assertions };
}

export { BUILD_DIR };
