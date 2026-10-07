import sharp from "sharp";

/**
 * Onion skin: overlay frames so motion paths read in one image. Older frames
 * are fainter. Dark canvases blend with "lighten" (max), light canvases with
 * "darken" (min).
 */
export async function onionSkin(files: string[], out: string, opts: { width?: number; mode: "dark" | "light" }) {
  const width = opts.width ?? 1200;
  const imgs = await Promise.all(
    files.map((f) => sharp(f).resize({ width }).removeAlpha().raw().toBuffer({ resolveWithObject: true })),
  );
  const { info } = imgs[0];
  const acc = Buffer.from(imgs[0].data);
  const n = imgs.length;
  const bgVal = opts.mode === "dark" ? 0 : 255;
  for (let i = 0; i < n; i++) {
    const w = n === 1 ? 1 : 0.3 + 0.7 * (i / (n - 1));
    const d = imgs[i].data;
    for (let p = 0; p < acc.length; p++) {
      // pull each frame toward the background by its weight, then combine
      const v = bgVal + (d[p] - bgVal) * w;
      if (i === 0) acc[p] = v;
      else acc[p] = opts.mode === "dark" ? Math.max(acc[p], v) : Math.min(acc[p], v);
    }
  }
  await sharp(acc, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toFile(out);
}
