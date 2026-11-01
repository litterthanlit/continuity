#!/usr/bin/env node
// GL budget and determinism, measured on a real build (docs/decisions/0009):
//
//   node scripts/gl-bench.mjs <slug>                    per-frame cost of every scene in SwiftShader
//   node scripts/gl-bench.mjs <slug> --determinism 4    + PNG-sequence renders with 1 and 4 workers, md5 per frame
//
// Cost: the page is seeked frame by frame and each GL canvas is read back (readPixels), so the
// time is the GPU process finishing the frame, not the call returning — gl.finish() does not wait
// across Chrome's GPU process and reads ~0.5 ms for a 300 ms frame.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const slug = process.argv[2];
if (!slug) throw new Error("usage: node scripts/gl-bench.mjs <slug> [--determinism N]");
const di = process.argv.indexOf("--determinism");
const si = process.argv.indexOf("--scene");
const only = si > 0 ? process.argv[si + 1] : undefined;
const xi = process.argv.indexOf("--globals");
const globals = xi > 0 ? JSON.parse(process.argv[xi + 1]) : {};
const workers = di > 0 ? Number(process.argv[di + 1]) : 0;

const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
};
run(process.execPath, ["bin/ct.mjs", "build", slug]);
const dir = join(ROOT, "build", slug);

function browserPath() {
  if (process.env.CT_BROWSER_PATH) return process.env.CT_BROWSER_PATH;
  const root = "/opt/pw-browsers";
  const shells = existsSync(root) ? readdirSync(root).filter((n) => n.startsWith("chromium_headless_shell-")).sort() : [];
  const p = shells.length ? join(root, shells[shells.length - 1], "chrome-headless-shell-linux64", "chrome-headless-shell") : "";
  if (!existsSync(p)) throw new Error("set CT_BROWSER_PATH to a headless Chrome");
  return p;
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".wav": "audio/wav", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer((req, res) => {
  const file = normalize(join(dir, decodeURIComponent((req.url ?? "/").split("?")[0]) === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0])));
  if (!file.startsWith(dir) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

// The flags HyperFrames' software mode launches Chrome with.
const browser = await puppeteer.launch({
  executablePath: browserPath(),
  headless: true,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--font-render-hinting=none", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument((g) => Object.assign(window, g), globals);
const t0 = Date.now();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => window.__ct.ready);
const prepareMs = Date.now() - t0;
const report = await page.evaluate(async (only) => {
  const tl = window.__ct.timeline;
  const sync = () => {
    for (const c of document.querySelectorAll("canvas[data-ct-gl]")) {
      const g = c.getContext("webgl2");
      if (g) g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
    }
  };
  const out = [];
  for (const s of tl.scenes) {
    if (only && s.scene !== only) continue;
    const ms = [];
    const n = Math.round(s.duration * tl.fps);
    for (let f = 0; f < n; f++) {
      const t = s.start + f / tl.fps;
      const a = performance.now();
      window.__ct.seek(t);
      sync();
      ms.push(performance.now() - a);
    }
    ms.sort((x, y) => x - y);
    out.push({ scene: s.scene, frames: n, gl: !!document.querySelector('[data-ct-scene="' + s.scene + '"] canvas[data-ct-gl]'), median: ms[Math.floor(n / 2)], p95: ms[Math.floor(n * 0.95)], max: ms[n - 1] });
  }
  return out;
}, only);
await browser.close();
server.close();

console.log(`${slug}: prepare (fonts, GL mount, env + shader compile) ${prepareMs} ms`);
for (const r of report) console.log(`  ${r.scene.padEnd(12)} ${r.gl ? "gl " : "dom"} ${String(r.frames).padStart(4)} frames  median ${r.median.toFixed(1).padStart(6)} ms  p95 ${r.p95.toFixed(1).padStart(6)} ms  max ${r.max.toFixed(1).padStart(6)} ms`);

if (workers > 0) {
  const env = { HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_NO_UPDATE_CHECK: "1", HYPERFRAMES_NO_AUTO_INSTALL: "1", HYPERFRAMES_SKIP_SKILLS: "1", HYPERFRAMES_BROWSER_PATH: browserPath() };
  const md5s = {};
  for (const w of [1, workers]) {
    const out = mkdtempSync(join(tmpdir(), `ct-gl-${w}-`));
    const a = Date.now();
    run("npx", ["hyperframes", "render", dir, "--format", "png-sequence", "-o", out, "-w", String(w), "--no-browser-gpu", "--quiet"], env);
    const secs = (Date.now() - a) / 1000;
    const files = readdirSync(out).filter((f) => f.endsWith(".png")).sort();
    md5s[w] = files.map((f) => createHash("md5").update(readFileSync(join(out, f))).digest("hex"));
    console.log(`  render png-sequence, ${w} worker(s): ${files.length} frames in ${secs.toFixed(1)} s (${((secs * 1000) / files.length).toFixed(0)} ms/frame incl. startup)`);
    if (process.env.CT_KEEP_FRAMES) console.log(`  frames kept in ${out}`);
    else rmSync(out, { recursive: true, force: true });
  }
  const [a, b] = [md5s[1], md5s[workers]];
  const same = a.filter((h, i) => h === b[i]).length;
  console.log(`  determinism: ${same}/${a.length} frames byte-identical between 1 and ${workers} workers; ${new Set(a).size} distinct frames`);
  const diff = a.map((h, i) => (h === b[i] ? -1 : i)).filter((i) => i >= 0);
  if (diff.length) console.log(`  differing frames (0-based): ${diff.join(", ")}`);
  if (same !== a.length || a.length !== b.length) process.exitCode = 1;
}
