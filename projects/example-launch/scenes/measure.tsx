import { scene, El, Window, LineChart, Pill } from "continuity";
import { Chapter, SURFACE } from "../lib/chapter.js";

// 03 · Measure — the motion-energy curve of this film draws under a playhead,
// then three green verdict pills. Data is the cut's "cardiogram": peaks on beats,
// valleys on holds, never flat.

const ENERGY = [0.15, 0.7, 0.35, 0.85, 0.3, 0.65, 0.95, 0.4, 0.8, 0.3, 0.75, 0.9];

// The shared chapter surface: full title-safe width, same top edge in every chapter.
const WIN_W = SURFACE.width; // 1728
const WIN_H = SURFACE.height; // 600 → body 530 = chart region 434 + footer 96
const PAD_X = 56; // chart + pill row inset inside the window body
const CHART_W = WIN_W - 2 - PAD_X * 2; // 1px borders → 1614: the playhead travels exactly this
const CHART_H = 340;
const BLEED = 3; // stroke-width 5 → round-cap radius 2.5

export default scene({
  view: ({ text }) => (
    <Chapter eyebrow={text.eyebrow} headline={text.headline} sub={text.sub}>
      <Window ct="chart" title="ct motion · launch.mp4" width={WIN_W} height={WIN_H}>
        <div class="flex h-full flex-col">
          {/* chart region */}
          <div class="relative flex flex-1 items-center" style={{ paddingLeft: `${PAD_X}px`, paddingRight: `${PAD_X}px` }}>
            <div class="relative" style={{ width: `${CHART_W}px`, height: `${CHART_H}px` }}>
              {/* quiet instrument grid: three hairlines + baseline */}
              {[0.25, 0.5, 0.75].map((f) => (
                <div data-layout-ignore class="absolute inset-x-0 h-px bg-fg/[0.06]" style={{ top: `${f * CHART_H}px` }} />
              ))}
              <div data-layout-ignore class="absolute inset-x-0 bottom-0 h-px bg-border" />
              {/* plot = line + fill, revealed by a wipe that IS the playhead's move. It bleeds
                  BLEED px past the chart so the round caps aren't cut (≤ 3px off the head). */}
              <El ct="plot" data-layout-ignore class="absolute" style={{ left: `${-BLEED}px`, right: `${-BLEED}px`, top: "-12px", bottom: "-12px" }}>
                <LineChart ct="energy" data={ENERGY} width={CHART_W} height={CHART_H} class={`absolute left-[${BLEED}px] top-[12px] block overflow-visible`} />
              </El>
              {/* playhead: 2px accent line with a knob, starts on the chart's left edge */}
              <El ct="head" data-layout-ignore class="absolute bottom-[-10px] top-[-18px] w-[2px]" style={{ left: "-1px" }}>
                <div class="absolute inset-0 bg-accent" style={{ boxShadow: "0 0 18px color-mix(in oklab, var(--color-accent) 70%, transparent)" }} />
                <div class="absolute left-1/2 top-0 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
              </El>
            </div>
          </div>
          {/* verdict row */}
          <div class="flex h-[96px] shrink-0 items-center gap-[16px] border-t border-border" style={{ paddingLeft: `${PAD_X}px`, paddingRight: `${PAD_X}px` }}>
            <Pill ct="eased" dot="positive">100% eased</Pill>
            <Pill ct="dead" dot="positive">0 dead zones</Pill>
            <Pill ct="jolts" dot="positive">0 jolts</Pill>
          </div>
        </div>
      </Window>
    </Chapter>
  ),
  motion: (m) => {
    // b1 — copy leads, the instrument rises under it and resolves flat before the data moves.
    m.enter("eyebrow", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.1", split: "lines" });
    m.enter("sub", "rise", { at: "after:headline-0.25", distance: 24 });
    m.enter("chart", "rise", { at: "b1+0.25", distance: 96, duration: "hero" });
    m.tween("chart", { rotateX: [10, 0] }, { at: "b1+0.25", duration: "hero", ease: "enter" });

    // b2 — the playhead pulls the line: same start, duration and ease; it travels the chart width.
    // The line is revealed by a left→right wipe, not the `draw` preset: `draw` advances by
    // arc length, so on this zig-zag its tip lagged the playhead by up to 55px and the fill
    // showed ahead of the curve. A wipe advances by x, so the tip sits exactly under the head.
    m.enter("plot", "wipeRight", { at: "b2", duration: "linger", ease: "inOut" });
    m.tween("head", { x: [0, CHART_W] }, { at: "b2", duration: "linger", ease: "inOut" });
    m.enter("energy-area", "fade", { at: "b2+0.8", duration: "slow" });

    // b3 — the verdict, in reading order.
    m.enter(["eased", "dead", "jolts"], "scalePop", { at: "b3", stagger: "list" });

    m.camera({ scale: [1, 1.03] });
  },
});
