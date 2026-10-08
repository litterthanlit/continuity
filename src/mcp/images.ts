import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";

/** Long edge cap for images sent to a model (larger gets downscaled server-side anyway). */
export const MAX_EDGE = 1568;
/** Images per tool result; more are listed by path. */
export const MAX_IMAGES = 12;

export interface ImageBlock {
  type: "image";
  data: string;
  mimeType: string;
}

/** A PNG on disk as an MCP image block, downscaled so its long edge is ≤ MAX_EDGE. */
export async function imageBlock(file: string): Promise<ImageBlock | null> {
  if (!existsSync(file)) return null;
  const buf = readFileSync(file);
  const meta = await sharp(buf).metadata();
  const long = Math.max(meta.width ?? 0, meta.height ?? 0);
  const out =
    long > MAX_EDGE
      ? await sharp(buf)
          .resize(meta.width! >= meta.height! ? { width: MAX_EDGE } : { height: MAX_EDGE })
          .png({ compressionLevel: 9 })
          .toBuffer()
      : buf;
  return { type: "image", data: out.toString("base64"), mimeType: "image/png" };
}

export async function imageBlocks(files: string[]): Promise<{ blocks: ImageBlock[]; omitted: string[] }> {
  const blocks: ImageBlock[] = [];
  for (const f of files.slice(0, MAX_IMAGES)) {
    const b = await imageBlock(f);
    if (b) blocks.push(b);
  }
  return { blocks, omitted: files.slice(MAX_IMAGES) };
}
