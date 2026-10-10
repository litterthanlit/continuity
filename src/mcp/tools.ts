import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CallToolResult, McpServer, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import { catalog } from "../cli/commands/docs.js";
import { readWorkConfig } from "../paths.js";
import { themes } from "../themes/index.js";
import { KIT_NAMES } from "../themes/kits.js";
import { NEW_SLUG, SandboxError, SLUG, listProjectFiles, readProjectFile, writeProjectFile } from "./files.js";
import { imageBlocks } from "./images.js";
import { runCt, serialized, type CtRun } from "./run.js";

export interface Workspace {
  root: () => Promise<string>;
}

const slug = z.string().regex(SLUG, "lowercase kebab-case project slug").describe("Project slug (folder under the projects dir)");
const sceneId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).describe("Scene id from the storyboard");

const text = (t: string) => ({ type: "text" as const, text: t });
const tail = (log: string, n = 40) => log.trim().split("\n").slice(-n).join("\n");

function err(message: string): CallToolResult {
  return { content: [text(message)], isError: true };
}

async function projectsDir(ws: Workspace): Promise<string> {
  const root = await ws.root();
  return resolve(root, readWorkConfig(root).projectsDir);
}

/** Run `ct …` for a tool call: progress while it runs, structured result + log + images back. */
async function ct(
  ws: Workspace,
  ctx: ServerContext,
  args: string[],
  opts: { key?: string; images?: (r: Record<string, unknown>) => string[]; headline?: (r: Record<string, unknown>, run: CtRun) => string; timeoutMs?: number } = {},
): Promise<CallToolResult> {
  const root = await ws.root();
  const token = ctx.mcpReq._meta?.progressToken;
  const go = () =>
    runCt(args, {
      root,
      signal: ctx.mcpReq.signal,
      timeoutMs: opts.timeoutMs,
      onProgress:
        token === undefined
          ? undefined
          : (s, last) =>
              void ctx.mcpReq
                .notify({ method: "notifications/progress", params: { progressToken: token, progress: Math.round(s), message: last || `ct ${args[0]} running (${Math.round(s)}s)` } })
                .catch(() => undefined),
    });
  let run: CtRun;
  try {
    run = await (opts.key ? serialized(`${root}:${opts.key}`, go) : go());
  } catch (e) {
    return err(`ct ${args[0]} failed to run: ${(e as Error).message}`);
  }
  const hasResult = Object.keys(run.result).length > 0;
  // Exit 2 = usage error; a non-zero exit without a result = crash. Gate findings (exit 1 + result) are data, not errors.
  if (run.code === 2 || (run.code !== 0 && !hasResult)) return err(`ct ${args.join(" ")} — exit ${run.code}\n\n${tail(run.log, 60)}`);
  const files = opts.images?.(run.result) ?? [];
  const { blocks, omitted } = await imageBlocks(files);
  const head = opts.headline?.(run.result, run) ?? `ct ${args[0]} — exit ${run.code}`;
  const body = [head, omitted.length ? `(${omitted.length} more image(s) on disk: ${omitted.join(", ")})` : "", "```", tail(run.log), "```"].filter(Boolean).join("\n");
  return { content: [text(body), ...blocks], structuredContent: { exitCode: run.code, ...run.result } };
}

const counts = (r: Record<string, unknown>) =>
  r.errors !== undefined ? `${r.ok ? "✔ pass" : "✖ fail"} — ${r.errors} error(s), ${r.warnings} warning(s)` : "";
const flag = (k: string, v: string | number | boolean | undefined) => (v === undefined || v === false ? [] : [`--${k}=${v}`]);
const str = (r: Record<string, unknown>, k: string) => (typeof r[k] === "string" ? (r[k] as string) : undefined);
const strs = (r: Record<string, unknown>, k: string) => (Array.isArray(r[k]) ? (r[k] as string[]) : []);

export function registerTools(server: McpServer, ws: Workspace) {
  // ── setup ────────────────────────────────────────────────────────────
  server.registerTool(
    "doctor",
    { title: "Toolchain check", description: "Check Node, the HyperFrames pin, headless Chrome and ffmpeg, and show which repo/projects dir the server works in.", annotations: { readOnlyHint: true } },
    async (ctx) => ct(ws, ctx, ["doctor"], { headline: (r) => (r.ready ? "✔ ready" : "✖ toolchain incomplete — see checks") }),
  );

  server.registerTool(
    "init_repo",
    {
      title: "Set up the repo",
      description: "Set up the workspace repo for Continuity: continuity.json, the projects dir (ES modules + editor tsconfig), a managed .gitignore block. With claude=true also a CLAUDE.md block and Claude Code permissions. Safe to re-run.",
      inputSchema: z.object({ claude: z.boolean().optional().describe("Also write the CLAUDE.md block and .claude/settings.json permission (default false)") }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ claude }, ctx) => ct(ws, ctx, ["init", ...(claude ? [] : ["--no-claude"])], { headline: (r) => `initialised ${String(r.root ?? "")}` }),
  );

  server.registerTool(
    "list_projects",
    { title: "List projects", description: "Projects in the workspace with title, format, iteration count and best iteration.", annotations: { readOnlyHint: true } },
    async () => {
      const dir = await projectsDir(ws);
      const projects = (existsSync(dir) ? readdirSync(dir) : [])
        .filter((s) => SLUG.test(s) && existsSync(join(dir, s, "storyboard.json")))
        .map((s) => {
          let title = s;
          let aspect: string | undefined;
          try {
            const sb = JSON.parse(readFileSync(join(dir, s, "storyboard.json"), "utf8"));
            title = sb.title ?? s;
            aspect = sb.format?.aspect;
          } catch {
            /* invalid storyboard: still listed */
          }
          let iterations = 0;
          let best: number | null = null;
          try {
            const st = JSON.parse(readFileSync(join(dir, s, ".continuity", "state.json"), "utf8"));
            iterations = st.iterations?.length ?? 0;
            best = st.best ?? null;
          } catch {
            /* no iterations yet */
          }
          return { slug: s, title, aspect: aspect ?? null, iterations, best };
        });
      const lines = projects.map((p) => `- ${p.slug} — ${p.title} (${p.aspect ?? "?"}) · ${p.iterations} iteration(s)${p.best ? ` · best #${p.best}` : ""}`);
      return { content: [text(projects.length ? lines.join("\n") : `no projects in ${dir} — create one with new_project`)], structuredContent: { projectsDir: dir, projects } };
    },
  );

  server.registerTool(
    "new_project",
    {
      title: "New project",
      description: "Scaffold a project (brief.md, storyboard.json, one scene) from the template. Next: write the brief and storyboard.",
      inputSchema: z.object({
        slug: z.string().regex(NEW_SLUG, "lowercase kebab-case, starting with a letter").describe("New project slug"),
        aspect: z.enum(["16:9", "9:16", "1:1", "4:5"]).default("16:9"),
        theme: z.enum(Object.keys(themes) as [string, ...string[]]).default("mono-dark"),
        type: z
          .enum([...KIT_NAMES, "classic"])
          .optional()
          .describe("Type kit (font pairing). Default: the theme's suggested kit. classic = the theme's v1 fonts"),
        title: z.string().max(120).optional(),
      }),
    },
    async ({ slug, aspect, theme, type, title }, ctx) =>
      ct(ws, ctx, ["new", slug, `--aspect=${aspect}`, `--theme=${theme}`, ...flag("type", type), ...flag("title", title)], {
        key: slug,
        headline: (r) => `created ${String(r.dir ?? slug)}`,
      }),
  );

  // ── project files (sandboxed) ────────────────────────────────────────
  server.registerTool(
    "list_project_files",
    { title: "List project files", description: "Source files of a project (brief, treatment, storyboard, theme, scenes, lib, text assets).", inputSchema: z.object({ slug }), annotations: { readOnlyHint: true } },
    async ({ slug }) => {
      try {
        const files = listProjectFiles(await projectsDir(ws), slug);
        return { content: [text(files.map((f) => `${f.path} (${f.bytes} B)`).join("\n") || "(empty)")], structuredContent: { slug, files } };
      } catch (e) {
        return err((e as Error).message);
      }
    },
  );

  server.registerTool(
    "read_project_file",
    {
      title: "Read project file",
      description: "Read one source file of a project. Paths are relative to the project: brief.md, treatment.md, storyboard.json, theme.ts, scenes/<id>.tsx, lib/…, assets/….",
      inputSchema: z.object({ slug, path: z.string().max(200) }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug, path }) => {
      try {
        return { content: [text(readProjectFile(await projectsDir(ws), slug, path))] };
      } catch (e) {
        return err((e as Error).message);
      }
    },
  );

  server.registerTool(
    "write_project_file",
    {
      title: "Write project file",
      description:
        "Create or overwrite one source file of a project (brief.md, treatment.md, storyboard.json, theme.ts, scenes/<id>.tsx, lib/**/*.ts(x)|json, assets/**/*.svg|json|css|txt). Code and storyboard writes run the fast lint and return its findings — fix errors before moving on.",
      inputSchema: z.object({ slug, path: z.string().max(200), content: z.string() }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ slug, path, content }, ctx) => {
      let abs: string;
      try {
        abs = writeProjectFile(await projectsDir(ws), slug, path, content);
      } catch (e) {
        return err(e instanceof SandboxError ? e.message : `write failed: ${(e as Error).message}`);
      }
      if (!/^(storyboard\.json|theme\.ts|scenes\/|lib\/)/.test(path)) {
        return { content: [text(`wrote ${slug}/${path}`)], structuredContent: { path: abs, bytes: Buffer.byteLength(content) } };
      }
      const res = await ct(ws, ctx, ["lint", slug, "--fast=true"], { key: slug, headline: (r) => `wrote ${slug}/${path} · lint ${counts(r)}` });
      return { ...res, structuredContent: { path: abs, bytes: Buffer.byteLength(content), lint: res.structuredContent ?? null } };
    },
  );

  // ── gate ─────────────────────────────────────────────────────────────
  server.registerTool(
    "lint",
    {
      title: "Lint (fast static gate)",
      description: "Storyboard schema, build, timeline motion lint, determinism lint and HyperFrames lint. No browser; seconds. storyboardOnly validates storyboard.json before scenes exist.",
      inputSchema: z.object({ slug, scene: sceneId.optional(), storyboardOnly: z.boolean().optional(), fast: z.boolean().optional().describe("skip HyperFrames lint") }),
    },
    async ({ slug, scene, storyboardOnly, fast }, ctx) =>
      ct(ws, ctx, ["lint", slug, ...flag("scene", scene), ...flag("storyboard", storyboardOnly), ...flag("fast", fast)], { key: slug, headline: (r) => `lint ${counts(r)}` }),
  );

  server.registerTool(
    "check",
    {
      title: "Check (THE gate)",
      description:
        "Lint + browser audits: layout overflow/overlap/occlusion, contrast, safe areas, type size, clipping, collisions in motion. The full run records the result on the current iteration. scene=<id> checks one scene in isolation (faster; not the project gate). deep=true also verifies the generated motion assertions (slow; once before the final render).",
      inputSchema: z.object({ slug, scene: sceneId.optional(), deep: z.boolean().optional() }),
    },
    async ({ slug, scene, deep }, ctx) =>
      ct(ws, ctx, ["check", slug, ...flag("scene", scene), ...flag("deep", deep)], { key: slug, headline: (r) => `check (iteration ${String(r.iteration ?? "?")}${scene ? `, scene ${scene}` : ""}) ${counts(r)}` }),
  );

  server.registerTool(
    "timeline",
    {
      title: "Motion timeline",
      description: "Every tween with start, duration, ease, preset and stagger — reason about rhythm with numbers.",
      inputSchema: z.object({ slug, scene: sceneId.optional() }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug, scene }, ctx) => ct(ws, ctx, ["timeline", slug, ...flag("scene", scene)], { key: slug, headline: () => `timeline${scene ? ` (${scene})` : ""}` }),
  );

  // ── eyes ─────────────────────────────────────────────────────────────
  server.registerTool(
    "stills",
    {
      title: "Stills",
      description: "Full-resolution frames for close reading (type, spacing, detail), returned as images. Default: one settled frame per scene. beats=true: a frame after every storyboard beat. at=[seconds]: exact global times.",
      inputSchema: z.object({ slug, scene: sceneId.optional(), beats: z.boolean().optional(), at: z.array(z.number().min(0)).max(24).optional() }),
    },
    async ({ slug, scene, beats, at }, ctx) =>
      ct(ws, ctx, ["stills", slug, ...flag("scene", scene), ...flag("beats", beats), ...(at?.length ? [`--at=${at.join(",")}`] : [])], {
        key: slug,
        images: (r) => (Array.isArray(r.frames) ? (r.frames as Array<{ file: string }>).map((f) => f.file) : []),
        headline: (r) => `stills · iteration ${String(r.iteration ?? "?")} · ${Array.isArray(r.frames) ? r.frames.length : 0} frame(s)`,
      }),
  );

  server.registerTool(
    "contact_sheet",
    {
      title: "Contact sheet",
      description: "Timecoded contact sheet(s) of the whole video (or one scene) as images — rhythm, hierarchy and continuity at a glance. anchors=true overlays the A1–F6 grid for precise critique; rings mark gate findings.",
      inputSchema: z.object({ slug, scene: sceneId.optional(), every: z.number().min(0.1).max(10).optional(), anchors: z.boolean().optional() }),
    },
    async ({ slug, scene, every, anchors }, ctx) =>
      ct(ws, ctx, ["sheet", slug, ...flag("scene", scene), ...flag("every", every), ...flag("anchors", anchors)], {
        key: slug,
        images: (r) => strs(r, "sheets"),
        headline: (r) => `contact sheet · iteration ${String(r.iteration ?? "?")} · ${String(r.frames ?? 0)} frames every ${String(r.every ?? "?")}s`,
      }),
  );

  server.registerTool(
    "motion_strip",
    {
      title: "Motion strip (onion skin)",
      description: "Onion skin + filmstrip of one scene's motion window as an image — trajectories, direction and overlaps. Times are scene-local; default window is the entrance choreography.",
      inputSchema: z.object({ slug, scene: sceneId, from: z.number().min(0).optional(), to: z.number().min(0).optional(), frames: z.number().int().min(2).max(12).optional() }),
    },
    async ({ slug, scene, from, to, frames }, ctx) =>
      ct(ws, ctx, ["strip", slug, `--scene=${scene}`, ...flag("from", from), ...flag("to", to), ...flag("frames", frames)], {
        key: slug,
        images: (r) => [str(r, "image")].filter((x): x is string => Boolean(x)),
        headline: (r) => `motion strip · ${scene} · ${String(r.from ?? "")}–${String(r.to ?? "")}s`,
      }),
  );

  server.registerTool(
    "motion_analysis",
    {
      title: "Motion analysis",
      description: "Motion-energy chart of the rendered cut (image) + stats: active share, dead zones, unexplained jolts. Makes a draft render first if this iteration has none.",
      inputSchema: z.object({ slug }),
    },
    async ({ slug }, ctx) =>
      ct(ws, ctx, ["motion", slug], {
        key: slug,
        images: (r) => [str(r, "image")].filter((x): x is string => Boolean(x)),
        headline: (r) => {
          const st = (r.stats ?? {}) as { activeShare?: number };
          return `motion · active ${st.activeShare !== undefined ? Math.round(st.activeShare * 100) : "?"}% · ${Array.isArray(r.deadZones) ? r.deadZones.length : "?"} dead zone(s) · ${Array.isArray(r.spikes) ? r.spikes.length : "?"} jolt(s)`;
        },
      }),
  );

  // ── ship ─────────────────────────────────────────────────────────────
  server.registerTool(
    "render",
    {
      title: "Render",
      description: "Render the video and QC the encoded file (duration, resolution, black/frozen segments). Returns the file path. Use draft=true while iterating; the final render takes minutes for long videos.",
      inputSchema: z.object({ slug, draft: z.boolean().optional(), format: z.enum(["mp4", "webm", "mov", "gif"]).optional(), quality: z.enum(["draft", "looks", "delivery"]).optional() }),
    },
    async ({ slug, draft, format, quality }, ctx) =>
      ct(ws, ctx, ["render", slug, ...flag("draft", draft), ...flag("format", format), ...flag("quality", quality)], {
        key: slug,
        headline: (r) =>
          r.output
            ? `${r.ok ? "✔" : "✖ QC errors —"} ${String(r.output)} · ${typeof r.durationS === "number" ? r.durationS.toFixed(2) : "?"}s · ${typeof r.sizeBytes === "number" ? (r.sizeBytes / 1e6).toFixed(1) : "?"} MB`
            : `render ${counts(r) || "failed"}`,
      }),
  );

  server.registerTool(
    "report",
    { title: "Report", description: "Write .continuity/report.md (+ poster and contact sheet) for the best iteration and return the markdown.", inputSchema: z.object({ slug }) },
    async ({ slug }, ctx) => ct(ws, ctx, ["report", slug], { key: slug, headline: (r) => String(r.markdown ?? "") }),
  );

  // ── bookkeeping ──────────────────────────────────────────────────────
  server.registerTool(
    "status",
    { title: "Iteration status", description: "Iteration history: gate results, renders, scores, verdicts, the best iteration, and whether sources changed since the last one.", inputSchema: z.object({ slug }), annotations: { readOnlyHint: true } },
    async ({ slug }, ctx) => ct(ws, ctx, ["status", slug], { key: slug, headline: (r) => `best: ${r.best ? `#${String(r.best)}` : "none"} · current: ${r.current ? `#${String(r.current)}` : "unchecked"}` }),
  );

  const axis = z.number().int().min(1).max(5);
  server.registerTool(
    "score",
    {
      title: "Record critique scores",
      description: "Record 1–5 scores on the five axes (and the critique) for the current iteration. The bar to ship: every axis ≥ 4 with a clean gate.",
      inputSchema: z.object({ slug, intent: axis, composition: axis, typography: axis, temporal: axis, craft: axis, note: z.string().max(300).optional(), critique: z.string().max(60_000).optional().describe("Full critique markdown") }),
    },
    async ({ slug, intent, composition, typography, temporal, craft, note, critique }, ctx) =>
      ct(
        ws,
        ctx,
        ["score", slug, `--intent=${intent}`, `--composition=${composition}`, `--typography=${typography}`, `--temporal=${temporal}`, `--craft=${craft}`, ...flag("note", note), ...flag("critique", critique)],
        { key: slug, headline: (r) => `iteration ${String(r.iteration ?? "?")} scored · mean ${String((r.scores as { mean?: number } | undefined)?.mean ?? "?")}${r.passesBar ? " · passes the bar" : " · below the bar"}` },
      ),
  );

  const iter = z.number().int().min(1);
  server.registerTool(
    "compare",
    {
      title: "Compare iterations",
      description: "Side-by-side packs of two iterations at matching points, in both orders (A|B and B|A), as images — for unbiased pairwise judging. Then record a verdict.",
      inputSchema: z.object({ slug, a: iter, b: iter, frames: z.number().int().min(2).max(16).optional() }),
    },
    async ({ slug, a, b, frames }, ctx) =>
      ct(ws, ctx, ["compare", slug, String(a), String(b), ...flag("frames", frames)], { key: slug, images: (r) => strs(r, "packs"), headline: () => `compare #${a} vs #${b} — judge both packs; if they disagree it's a tie` }),
  );

  server.registerTool(
    "verdict",
    {
      title: "Record verdict",
      description: "Record a pairwise judgement between two iterations; promotes the winner to best when its gate is clean.",
      inputSchema: z.object({ slug, a: iter, b: iter, winner: iter, reason: z.string().min(3).max(2000) }),
    },
    async ({ slug, a, b, winner, reason }, ctx) =>
      ct(ws, ctx, ["verdict", slug, String(a), String(b), `--winner=${winner}`, `--reason=${reason}`], { key: slug, headline: (r) => `verdict recorded · best is #${String(r.best ?? "?")}` }),
  );

  server.registerTool(
    "restore",
    {
      title: "Restore iteration",
      description: "Replace the project's sources (storyboard, scenes, lib, theme, assets) with an earlier iteration's snapshot — e.g. back to the best after a regression.",
      inputSchema: z.object({ slug, iteration: z.union([iter, z.literal("best")]) }),
      annotations: { destructiveHint: true },
    },
    async ({ slug, iteration }, ctx) => ct(ws, ctx, ["restore", slug, String(iteration)], { key: slug, headline: (r) => `restored iteration #${String(r.restored ?? iteration)}` }),
  );

  // ── reference ────────────────────────────────────────────────────────
  server.registerTool(
    "catalog",
    { title: "Catalog", description: "Presets, tokens (durations, eases, staggers), transitions, type scale, themes and every lint rule — generated from the engine.", annotations: { readOnlyHint: true } },
    async () => ({ content: [text(catalog())] }),
  );
}
