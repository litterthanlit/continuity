import { scene, Stage, Safe, Label, Phone, List, Slider, Cursor } from "continuity";

const W = 560;
const FROM = 0.1;
const TO = 0.9;

/** The before state: a skeleton — grey bars where the content will be. Decorative imagery. */
function Skeleton() {
  return (
    <div class="flex flex-col gap-[32px] px-[32px] pt-[112px]" data-layout-ignore>
      <div class="h-[40px] w-[200px] rounded-control bg-fg/12" />
      {[0, 1, 2, 3].map(() => (
        <div class="flex items-center gap-[16px]">
          <div class="h-[64px] w-[64px] rounded-control bg-fg/8" />
          <div class="flex flex-1 flex-col gap-[12px]">
            <div class="h-[16px] w-[80%] rounded-control bg-fg/12" />
            <div class="h-[16px] w-[50%] rounded-control bg-fg/8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Frame one is already the interesting state: the broken "before" and a hand on the control.
// One reveal (the depth swap, on glide), then a long hold — the loop cuts back to frame one.
export default scene({
  view: ({ text }) => (
    <Stage>
      <Safe>
        <Label ct="label" class="absolute left-0 top-0">
          {text.label}
        </Label>
        <div class="absolute inset-0" style="perspective:1600px">
          <Phone ct="before" width={340} class="absolute left-[316px] top-[72px]">
            <Skeleton />
          </Phone>
          <Phone ct="after" width={340} class="absolute left-[316px] top-[72px]">
            <div class="flex h-full flex-col bg-surface-1 px-[24px] pt-[112px]">
              <List
                ct="rows"
                rows={[
                  { title: "Ship it", meta: "now" },
                  { title: "Review", meta: "2m" },
                  { title: "Polish", meta: "5m" },
                  { title: "Render", meta: "8m" },
                ]}
              />
            </div>
          </Phone>
        </div>
        <Slider ct="knob" label="Polish" value={FROM} width={W} class="absolute left-0 top-[836px]" />
        <Cursor ct="cursor" class="left-[64px] top-[908px]" />
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    // The machinery: the hand drags the thumb; fill, thumb, value and cursor move as one.
    m.click("cursor", { at: 0, ripple: false });
    m.tween("knob-thumb", { x: [FROM * W, TO * W] }, { at: "drag", duration: "linger", ease: "inOut" });
    m.tween("knob-fill", { scaleX: [FROM, TO] }, { at: "drag", duration: "linger", ease: "inOut" });
    m.counter("knob-value", { from: FROM, to: TO, decimals: 2, at: "drag", duration: "linger", ease: "inOut" });
    m.path("cursor", [{ x: (TO - FROM) * W, y: 0 }], { at: "drag", duration: "linger", ease: "inOut" });
    // The one reveal: before steps back and tilts, after steps forward over it. No fade between them.
    m.tween("before", { x: [0, -176], scale: [1, 0.86], rotateY: [0, 16], opacity: [1, 0.55] }, { at: "swap", duration: "glide", ease: "glide" });
    m.tween("after", { x: [64, 0], scale: [0.92, 1], opacity: [0, 1] }, { at: "swap", duration: "glide", ease: "glide", kind: "enter" });
    m.enter(["rows-r0", "rows-r1", "rows-r2", "rows-r3"], "rise", { at: "after:after-0.2", stagger: 0.067 });
    // The hand has nothing left to do: it lets go and leaves the frame to the result.
    m.path("cursor", [{ x: (TO - FROM) * W + 160, y: 120 }], { at: "after:knob-thumb+0.15", duration: "slow", ease: "inOut" });
  },
});
