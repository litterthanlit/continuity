/**
 * A WAV file's samples, read in Node: mono, at the file's own rate, no ffmpeg. The build analyses
 * a project's track to time its scenes, and `ct lint` builds, so a WAV track (the recommended
 * format: sample-exact timing) must not need ffmpeg. Other formats and encodings go to ffmpeg.
 */
export function readWav(buf: Buffer): { samples: Float32Array; sampleRate: number } | undefined {
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return undefined;
  let format = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  for (let at = 12; at + 8 <= buf.length; ) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    const body = at + 8;
    if (id === "fmt ") {
      format = buf.readUInt16LE(body);
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
      // WAVE_FORMAT_EXTENSIBLE: the real format is the sub-format GUID's first two bytes.
      if (format === 0xfffe && size >= 26) format = buf.readUInt16LE(body + 24);
    } else if (id === "data") {
      const read = sampleReader(format, bits);
      if (!read || !channels || !sampleRate) return undefined;
      const width = bits / 8;
      const frames = Math.floor(Math.min(size, buf.length - body) / (width * channels));
      const samples = new Float32Array(frames);
      for (let f = 0; f < frames; f++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) sum += read(buf, body + (f * channels + c) * width);
        samples[f] = sum / channels;
      }
      return { samples, sampleRate };
    }
    at = body + size + (size % 2);
  }
  return undefined;
}

function sampleReader(format: number, bits: number): ((b: Buffer, at: number) => number) | undefined {
  if (format === 1 && bits === 16) return (b, at) => b.readInt16LE(at) / 32768;
  if (format === 1 && bits === 24) return (b, at) => b.readIntLE(at, 3) / 8388608;
  if (format === 1 && bits === 32) return (b, at) => b.readInt32LE(at) / 2147483648;
  if (format === 3 && bits === 32) return (b, at) => b.readFloatLE(at);
  return undefined;
}
