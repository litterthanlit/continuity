# Motion recipes (litt)

Copy, then adapt timings to your beats. All assume the ids exist in the view. Every recipe
keeps litt's rules: responsive by default, one expressive moment per scene, exits at 0.75×,
travel 32px, the camera as the only ambient life.

## Statement (the workhorse)
```tsx
<Stage bg="lit">
  <Safe>
    <Headline ct="headline" class="absolute bottom-[96px] left-[96px] max-w-[1200px]">{text.headline}</Headline>
  </Safe>
</Stage>
```
```ts
m.enter("headline", "maskUp", { at: "b1", split: "lines", ease: "expressive" }); // the scene's moment
m.camera({ scale: [1, 1.03] });                                                    // ambient: ≤ 3%
```

## Label → statement → summary (the lockup)
```tsx
<Stack gap={32} class="absolute bottom-[96px] left-[96px] max-w-[1120px]">
  <Stack gap={8}>
    <Label ct="label">{text.label}</Label>
    <Headline ct="headline">{text.headline}</Headline>
  </Stack>
  <Body ct="body" class="max-w-[800px]">{text.body}</Body>
</Stack>
```
```ts
m.enter("label", "fade", { at: "b1" });
m.enter("headline", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
m.enter("body", "rise", { at: "after:headline-0.2" });
```

## Feature list (3–5 items)
```ts
m.enter(["f1", "f2", "f3"], "rise", { at: "b2" });          // 40ms list stagger, responsive
// later, focus one by ink: the others step back to the grey
m.emphasize(["f1", "f3"], "dim", { at: "b3", stagger: 0 });
```

## Stat
```tsx
<Stat ct="stat" value={1280} label={text.statLabel} size="display" delta={text.delta} deltaTone="success" />
```
```ts
m.enter("stat-label", "fade", { at: "b1" });
m.counter("stat", { from: 0, to: 1280, at: "b1", duration: "linger" });
m.enter("stat-delta", "rise", { at: "b1+0.6" });
```

## The product, placed
```ts
m.enter("window", "settle", { at: "b1" });                                   // the expressive moment
m.enter(["rows-r0", "rows-r1", "rows-r2"], "rise", { at: "after:window-0.3" }); // content follows
m.camera({ scale: [1, 1.02] });
```

## UI action with a cursor
```ts
m.enter("cursor", "fade", { at: "b2" });
m.path("cursor", [{ x: -272, y: -336 }], { at: "b2+0.1", duration: "slow" }); // an eased leg
m.click("cursor", { at: "after:cursor+0.2" });                               // pause, then click
m.enter("toast", "rise", { at: "after:cursor+0.35" });                       // the UI answers
```

## A selection that glides (P12)
```tsx
<Segmented ct="range" items={["Day", "Week", "Month"]} active={0} />
```
```ts
m.tween("range-thumb", { x: [0, 200] }, { at: "b3" });  // responsive spring by default
m.emphasize("range-s1", "ink", { at: "b3" });
m.emphasize("range-s0", "dim", { at: "b3" });
```

## Ink emphasis on a line
```ts
m.enter("line", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
m.emphasize(["pre", "post"], "dim", { at: "b2", stagger: 0 }); // the key word keeps fg
```

## Chart
```ts
m.enter(["bars-b0", "bars-b1", "bars-b2", "bars-b3"], "grow", { at: "b2" }); // from the baseline
m.enter("trend-line", "draw", { at: "b2+0.2", duration: "linger" });
m.enter("trend-dot", "fade", { at: "after:trend-line" });
```

## End card (the one centered statement)
```tsx
<Stage bg="lit">
  <Center>
    <Stack gap={8} class="items-center">
      <Headline ct="name">{text.name}</Headline>
      <Body ct="line">{text.line}</Body>
    </Stack>
  </Center>
</Stage>
```
```ts
m.enter("name", "settle", { at: "b1" });
m.enter("line", "fade", { at: "after:name-0.2" });
m.camera({ scale: [1, 1.03] });
```

## Exit choreography (only when something must leave before the cut)
```ts
m.exit(["body", "headline"], "liftOut", { at: "b3", stagger: "list" }); // 0.75× the entrance, ease out
```

## Transition language (storyboard)
```jsonc
// Most litt edits: cuts on the beat, one dip before the end card
{ "type": "cut" } · { "type": "dip" }
// Sequential product steps: push in reading order, blurred when fast
{ "type": "push", "dir": "left", "blur": true }
// The same surface in a new state
{ "type": "crossfade" }
// A state revealed
{ "type": "wipe", "angle": 120, "feather": 14 }
```

---

# Energetic register recipes (motion-craft §12)

All assume `"register": "energetic"` on the storyboard or the scene. Eases by role: `steep` for
interface and camera, `pop` for objects, `linear` for machines. `projects/_energetic` is the
working gallery of most of these — read it before building a reel.

## A decisive UI move (steep, 9 frames)
```ts
m.tween("panel", { x: [96, 0], opacity: [0, 1] }, { at: "b1", duration: "snap", ease: "steep", kind: "enter" });
m.tween("panel", { x: [0, -64] }, { at: "b2", duration: "snap", ease: "steep" });   // and on again
```

## The sticker slap (an object lands)
```tsx
<El ct="sticker" class="absolute left-[352px] top-[520px] flex h-[80px] items-center rounded-control bg-fg px-[32px] text-label font-label text-canvas shadow-float">
  {text.sticker}
</El>
```
```ts
// Big → placed, a little rotation left in it, on the pop spring. Rotation lives in the motion,
// not in a class: motion owns transform.
m.tween("sticker", { scale: [1.5, 1], rotate: [-14, -4], opacity: [0, 1] }, { at: "slap", ease: "pop", kind: "enter" });
```
A brand-coloured sticker (`bg-accent`) is the frame's one accent fill — nothing else in the frame
takes the accent.

## The collage formula (build once, use twice)
```tsx
// lib/collage.tsx — the formula: slots, sizes and timing fixed; content passed in.
export function Collage({ map, texture, print, sticker }: { map: string; texture: string; print: string; sticker: string }) {
  return (
    <Safe>
      <Media ct="map" src={map} treat="invert" width={456} height={600} class="absolute left-0 top-0" />
      <Media ct="texture" src={texture} treat="mono" width={484} height={288} class="absolute left-[488px] top-0" />
      <Media ct="print" src={print} treat="contrast" width={484} height={280} class="absolute left-[488px] top-[320px]" />
      <El ct="sticker" class="…">{sticker}</El>
    </Safe>
  );
}
export function collageMotion(m: MotionBuilder) {
  m.enter(["map", "texture", "print"], "rise", { at: "b1", distance: 96, ease: "pop", stagger: 0.067 }); // 2f apart
  m.tween("sticker", { scale: [1.5, 1], rotate: [-14, -4], opacity: [0, 1] }, { at: "slap", ease: "pop", kind: "enter" });
  m.camera({ scale: [1.02, 1.06] });
}
```
```tsx
// scenes/new-york.tsx and scenes/london.tsx differ only in content.
view: ({ text }) => <Stage bg="grid"><Collage map="assets/ny-map.jpg" texture="assets/ny-stone.jpg" print="assets/liberty.jpg" sticker={text.sticker} /></Stage>,
motion: (m) => collageMotion(m),
```

## The annotation formula (organic subject, technical overlay)
```tsx
<Media ct="rings" src="assets/rings.jpg" treat="invert" width={972} height={800} class="absolute left-0 top-0">
  <Path ct="link" d="M288 248 L600 392 L432 608" viewBox="0 0 972 800" width={972} height={800} strokeWidth={2} class="absolute inset-0" />
  <Marker ct="n1" label="01" class="left-[288px] top-[248px]" />
  <Marker ct="n2" label="02" class="left-[600px] top-[392px]" />
  <Marker ct="n3" label="03" side="left" class="left-[432px] top-[608px]" />
</Media>
```
```ts
m.tween("rings-img", { scale: [1.08, 1] }, { at: 0, duration: "linger", ease: "out" });    // drifts inside its frame
m.enter(["n1", "n2", "n3"], "rise", { at: "b1", distance: 48, ease: "pop", stagger: 0.067 });
m.enter("link", "draw", { at: "after:n3-0.1", duration: "slow", ease: "steep" });
```

## The selection-block wipe (copy never fades)
```tsx
<div class="absolute left-0 top-[848px]">
  <Caption ct="caption">{text.caption}</Caption>
  <El ct="sel" class="absolute inset-0 bg-fg" />
</div>
```
```ts
// The block sweeps on, the words are revealed under it, the block leaves to the right.
m.tween("sel", { clipRight: [100, 0] }, { at: "b2", duration: "snap", ease: "steep", kind: "enter" });
m.enter("caption", "wipeRight", { at: "b2+0.2", duration: "snap", ease: "steep" });
m.tween("sel", { clipLeft: [0, 100] }, { at: "after:sel", duration: "snap", ease: "steep" });
```
Lighter version for a label: `m.enter("label", "wipeRight", { duration: "snap", ease: "steep" })`.

## The terminal (a machine speaks)
```tsx
<Window ct="term" title="zsh" width={864} height={288}>
  <Terminal ct="sh" class="p-[48px]" size={32} lines={['$ ct search "archive"', "412 prints · 6 cities"]} />
</Window>
```
```ts
m.tween("term", { y: [96, 0], opacity: [0, 1] }, { at: "b1", duration: "snap", ease: "steep", kind: "enter" });
m.type("sh-l0", { at: "b1+0.35", cps: 30 });                 // linear: typing is a process
m.type("sh-l1", { at: "after:sh-l0+0.15", cps: 48 });        // the answer comes back faster
```

## A 2×2 grid that drifts (a hold)
```tsx
<Safe>
  <div class="grid h-full grid-cols-2 grid-rows-2 gap-[32px]">
    <Media ct="t1" src="assets/portrait.jpg" width={470} height={470} />
    <Media ct="t2" src="assets/art.jpg" width={470} height={470} treat="contrast" />
    <Card ct="t3" class="h-[470px] w-[470px]"><CodeBlock ct="src" code={CODE} numbers={false} size={26} /></Card>
    <Media ct="t4" src="assets/print.jpg" width={470} height={470} treat="invert" />
  </div>
</Safe>
```
```ts
m.enter(["t1", "t2", "t3", "t4"], "rise", { at: "b1", distance: 64, ease: "pop", stagger: 0.067 });
m.tween(["t1-img", "t2-img", "t4-img"], { scale: [1.06, 1] }, { at: "b1", duration: "linger", ease: "out", stagger: 0.1 });
```

## A spinning ring (a machine)
```ts
// Linear rotation is fine in the energetic register (ease-linear skips rotation-only moves).
m.tween("ring", { rotate: [0, 360] }, { at: 0, duration: 4, ease: "linear" });
```

## The match cut
```ts
// lib/shapes.ts — one constant, so both scenes put the shape on the same pixels.
export const GLOBE = { left: 316, top: 316, size: 448 };
```
Scene A ends on the pixel globe at `GLOBE`; scene B opens on a grid of 1s and 0s occupying the
same box, already settled, then the digits start to change. The storyboard transition is a plain
cut — the rhyme is the geometry, not an effect.

## The mirrored ending (close the loop)
```jsonc
// first scene:  "transition": { "type": "depth" }                  — fly in
// next-to-last: "transition": { "type": "depth", "dir": "out" }   — fly back out
// last scene reuses the first scene's layout from lib/ and lands the CTA (the handle types).
```

## Burst and hold (a storyboard skeleton, ~12s)
```jsonc
{ "register": "energetic", "scenes": [
  { "id": "open",     "duration": 2.4, "transition": { "type": "depth" } },                     // terminal types
  { "id": "collage",  "duration": 2.8, "transition": { "type": "push", "dir": "left", "blur": true, "ease": "steep", "duration": 0.4 } }, // burst
  { "id": "hold",     "duration": 1.4 },                                                         // one image, a drift: rest
  { "id": "ui-run",   "duration": 3.0, "transition": { "type": "wipe", "ease": "steep" } },      // burst: charts draw, rows stack
  { "id": "annotate", "duration": 2.6, "transition": { "type": "depth", "dir": "out" } },      // hold with detail
  { "id": "end",      "duration": 2.4 }                                                          // the opening frame, the CTA
]}
```

---

# Loop clip recipes (motion-craft §13, the `social-clip` skill)

`"loop": true` on the storyboard. Frame one is a real state, one reveal, a 30–50% hold.
`projects/_clip` is the working gallery of the first two.

## The slider (machinery that answers)
```tsx
const W = 560, FROM = 0.1, TO = 0.9;
<Slider ct="knob" label="Polish" value={FROM} width={W} class="absolute left-0 top-[836px]" />
<Cursor ct="cursor" class="left-[64px] top-[908px]" />   {/* already on the thumb at frame one */}
```
```ts
// Fill, thumb, value and the hand move as one — then the thing the slider drives answers.
m.click("cursor", { at: 0, ripple: false });
m.tween("knob-thumb", { x: [FROM * W, TO * W] }, { at: "drag", duration: "linger", ease: "inOut" });
m.tween("knob-fill", { scaleX: [FROM, TO] }, { at: "drag", duration: "linger", ease: "inOut" });
m.counter("knob-value", { from: FROM, to: TO, decimals: 2, at: "drag", duration: "linger", ease: "inOut" });
m.path("cursor", [{ x: (TO - FROM) * W, y: 0 }], { at: "drag", duration: "linger", ease: "inOut" });
m.path("cursor", [{ x: (TO - FROM) * W + 160, y: 120 }], { at: "after:knob-thumb+0.15", duration: "slow" }); // lets go, leaves
```

## Before → after, as a depth swap
```tsx
<div class="absolute inset-0" style="perspective:1600px">       {/* so the tilt reads as depth */}
  <Phone ct="before" width={340} class="absolute left-[316px] top-[72px]">…the problem…</Phone>
  <Phone ct="after" width={340} class="absolute left-[316px] top-[72px]">…the fix…</Phone>
</div>
```
```ts
// No fade between them: the before steps back and tilts, the after steps forward over it.
m.tween("before", { x: [0, -176], scale: [1, 0.86], rotateY: [0, 16], opacity: [1, 0.55] }, { at: "swap", duration: "glide", ease: "glide" });
m.tween("after", { x: [64, 0], scale: [0.92, 1], opacity: [0, 1] }, { at: "swap", duration: "glide", ease: "glide", kind: "enter" });
m.enter(["rows-r0", "rows-r1", "rows-r2", "rows-r3"], "rise", { at: "after:after-0.2", stagger: 0.067 }); // 2f apart
```

## Code beside the result (Emil's split)
```tsx
<Window ct="editor" title="sheet.tsx" width={880} height={560} class="absolute left-0 top-[160px]">
  <CodeBlock ct="code" code={CODE} size={26} class="p-[32px]" />
</Window>
<Phone ct="phone" width={360} class="absolute right-0 top-[96px]">
  <El ct="sheet" class="absolute inset-x-0 bottom-0 h-[60%] rounded-surface bg-surface-2" />
</Phone>
```
```ts
// The edited line steps up in ink, then the sheet replays with the new value.
m.emphasize("code-l3", "ink", { at: "b1" });
m.tween("sheet", { yPct: [100, 0] }, { at: "b1+0.3", duration: "glide", ease: "glide", kind: "enter" });
```

## Lift (tactile, in litt's terms)
```tsx
<div class="relative">
  <El ct="tile-glow" class="absolute inset-0 rounded-surface shadow-lift" style={{ opacity: "0" }} data-layout-ignore />
  <Card ct="tile">…</Card>
</div>
```
```ts
// Grabbed: up a touch while its zero-offset glow grows. Set down: back on the spring.
m.tween(["tile", "tile-glow"], { scale: [1, 1.03] }, { at: "grab", duration: "instant", ease: "out", stagger: 0 });
m.tween("tile-glow", { opacity: [0, 1] }, { at: "grab", duration: "instant", ease: "out" });
m.tween(["tile", "tile-glow"], { scale: [1.03, 1] }, { at: "drop" });
m.tween("tile-glow", { opacity: [1, 0] }, { at: "drop", duration: "instant", ease: "out" });
```

## Template, then swap
```tsx
// lib/variant.tsx — one layout; content, title and colour change together. Colour is identity: a data hue, in order.
export const VARIANTS = [
  { title: "Vanilla", hue: "amber" },
  { title: "Mint", hue: "teal" },
  { title: "Berry", hue: "rose" },
] as const;
export function Variant({ v }: { v: (typeof VARIANTS)[number] }) {
  return (
    <Safe>
      <Headline ct="title">{v.title}</Headline>
      <El ct="swatch" class="absolute right-0 top-0 h-[480px] w-[480px] rounded-surface" style={`background:var(--color-data-${v.hue}-tint)`} />
    </Safe>
  );
}
```
Each beat is a short scene rendering `<Variant v={VARIANTS[i]} />`, joined by cuts (or one
`wipe`); the last scene's end cuts back to the first variant for the loop.
