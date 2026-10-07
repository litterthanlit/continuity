import { spawn } from "node:child_process";
import type { Finding } from "../../spec/findings.js";

const FFMPEG = process.env.HYPERFRAMES_FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.HYPERFRAMES_FFPROBE_PATH || "ffprobe";

export function run(bin: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    p.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export const ffmpeg = (args: string[]) => run(FFMPEG, args);

export interface ProbeInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  frames: number;
  codec: string;
  size: number;
}

export async function probe(file: string): Promise<ProbeInfo> {
  const r = await run(FFPROBE, [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,r_frame_rate,nb_frames,codec_name:format=duration,size",
    "-of", "json", file,
  ]);
  if (r.code !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  const j = JSON.parse(r.stdout);
  const s = j.streams?.[0] ?? {};
  const [num, den] = String(s.r_frame_rate ?? "30/1").split("/").map(Number);
  return {
    duration: Number(j.format?.duration ?? 0),
    width: s.width,
    height: s.height,
    fps: den ? num / den : num,
    frames: Number(s.nb_frames ?? 0),
    codec: s.codec_name,
    size: Number(j.format?.size ?? 0),
  };
}

/**
 * Render QC on the encoded file: black segments, frozen segments, duration and
 * resolution drift. Dark themes legitimately open on near-black frames, so a
 * short black lead-in is info, not an error.
 */
export async function qc(file: string, expect: { duration: number; width: number; height: number; fps: number }): Promise<Finding[]> {
  const findings: Finding[] = [];
  const info = await probe(file);
  if (Math.abs(info.duration - expect.duration) > 1.5 / expect.fps) {
    findings.push({ source: "render", rule: "duration", severity: "error", message: `rendered ${info.duration.toFixed(3)}s, timeline is ${expect.duration}s` });
  }
  if (info.width !== expect.width || info.height !== expect.height) {
    findings.push({ source: "render", rule: "resolution", severity: "error", message: `rendered ${info.width}×${info.height}, expected ${expect.width}×${expect.height}` });
  }
  const r = await ffmpeg([
    "-hide_banner", "-nostats", "-i", file,
    "-vf", "blackdetect=d=0.25:pic_th=0.985,freezedetect=n=-60dB:d=1.5",
    "-an", "-f", "null", "-",
  ]);
  for (const m of r.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g)) {
    const [start, , dur] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const leadIn = start < 0.05 && dur <= 0.6;
    findings.push({
      source: "render",
      rule: "black-frames",
      severity: leadIn ? "info" : dur > 1 ? "error" : "warning",
      time: start,
      message: `${dur.toFixed(2)}s of (near-)black frames from ${start.toFixed(2)}s`,
      suggestion: leadIn ? undefined : "something should be on screen — check opacity/visibility around this time",
    });
  }
  const starts = [...r.stderr.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const durs = [...r.stderr.matchAll(/freeze_duration: ([\d.]+)/g)].map((m) => Number(m[1]));
  starts.forEach((start, i) => {
    const dur = durs[i] ?? expect.duration - start;
    findings.push({
      source: "render",
      rule: "frozen",
      severity: dur >= 3 ? "warning" : "info",
      time: start,
      message: `${dur.toFixed(2)}s with no visible change from ${start.toFixed(2)}s`,
      suggestion: dur >= 3 ? "add ambient life (camera drift, loop on bg/glow) or tighten the hold" : undefined,
    });
  });
  return findings;
}
