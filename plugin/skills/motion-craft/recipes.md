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
