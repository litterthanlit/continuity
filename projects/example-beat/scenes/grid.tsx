import { scene, Stage, Window, Label, El } from "continuity";

/** The track's level, a bar of sixteenths (fixed data: the frame is a function of time, not of chance). */
const LEVELS = [0.92, 0.3, 0.55, 0.28, 0.86, 0.32, 0.6, 0.3, 0.9, 0.34, 0.58, 0.3, 0.84, 0.36, 0.62, 0.4];

// The machine listening: this track's bar in a window. Its sixteen level bars light one per
// sixteenth and its four ticks step from the grey to fg on their beats, so the beat shows with
// the sound off.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Window ct="win" title={text.label} width={1248} height={600} class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div class="flex h-full flex-col justify-between p-[64px]">
          <Label ct="bpm" class="font-mono">{text.bpm}</Label>
          <div class="flex h-[220px] items-center gap-[12px]">
            {LEVELS.map((v, i) => (
              <El ct={`b${i}`} class="flex-1 bg-current text-fg-muted" style={{ height: `${Math.round(v * 100)}%` }} data-layout-ignore key={i} />
            ))}
          </div>
          <div class="flex">
            {[0, 1, 2, 3].map((i) => (
              <El ct={`t${i}`} class="flex-1 border-t-[4px] border-current pt-[16px] font-mono text-label" key={i}>
                {String(i + 1)}
              </El>
            ))}
          </div>
        </div>
      </Window>
    </Stage>
  ),
  motion: (m) => {
    m.enter("win", "whip", { at: "in", dir: "up", duration: "slow" });
    for (let i = 0; i < 4; i++) m.emphasize(`t${i}`, "ink", { at: `beat:${i}` });
    LEVELS.forEach((_, i) => m.emphasize(`b${i}`, "ink", { at: `beat:${i / 4}` }));
  },
});
