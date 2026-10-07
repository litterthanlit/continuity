import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { resolveBrowser } from "./env.js";
import { withBrowserSlot } from "./lock.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".mp4": "video/mp4",
};

/** Minimal static file server (localhost, random port) so pages load fonts/scripts same-origin. */
export async function serveDir(root: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const file = normalize(join(root, path === "/" ? "index.html" : path));
    if (!file.startsWith(normalize(root)) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => server.close(() => r())) };
}

export async function launch(): Promise<Browser> {
  const executablePath = resolveBrowser();
  if (!executablePath) throw new Error("No headless Chrome found. Set CT_BROWSER_PATH (see `pnpm ct doctor`).");
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--hide-scrollbars", "--force-color-profile=srgb"],
  });
}

export async function withBrowser<T>(fn: (b: Browser) => Promise<T>): Promise<T> {
  return withBrowserSlot(async () => {
    const b = await launch();
    try {
      return await fn(b);
    } finally {
      await b.close();
    }
  });
}

/** Render an HTML document to PNG (used for contact sheets, strips, charts, compare packs). */
export async function screenshotHtml(
  html: string,
  out: string,
  opts: { width: number; height?: number; baseDir?: string; browser?: Browser },
): Promise<void> {
  const run = async (b: Browser) => {
    const srv = opts.baseDir ? await serveDir(opts.baseDir) : null;
    const page: Page = await b.newPage();
    try {
      // fullPage screenshots grow to the content; start small so nothing is padded
      await page.setViewport({ width: opts.width, height: opts.height ?? 120, deviceScaleFactor: 1 });
      if (srv) {
        await page.setRequestInterception(true);
        page.on("request", (req) => {
          if (req.url() === srv.url + "__sheet.html") req.respond({ status: 200, contentType: "text/html", body: html });
          else req.continue();
        });
        await page.goto(srv.url + "__sheet.html", { waitUntil: "networkidle0" });
      } else {
        await page.setContent(html, { waitUntil: "load" });
      }
      await page.evaluate(() => document.fonts.ready.then(() => true));
      await page.screenshot({ path: out as `${string}.png`, fullPage: opts.height === undefined, type: "png" });
    } finally {
      await page.close();
      await srv?.close();
    }
  };
  if (opts.browser) await run(opts.browser);
  else await withBrowser(run);
}
