# Motion recipes

Copy, then adapt timings to your beats. All assume ids exist in the view.

## Statement headline (the workhorse)
```ts
m.enter("headline", "maskUp", { at: "b1", split: "lines" });   // lines rise behind a mask, 90ms apart
m.camera({ scale: [1, 1.035] });                                 // ambient push over the scene
```

## Eyebrow → headline → subhead
```ts
m.enter("eyebrow", "fadeBlur", { at: "b1" });
m.enter("headline", "maskUp", { at: "b1+0.12", split: "lines" });
m.enter("subhead", "rise", { at: "after:headline-0.25", distance: 24 });
```

## Word-by-word punch (kinetic type)
```ts
m.enter("line", "rise", { at: "b1", split: "words", stagger: "word", distance: 40, ease: "hero" });
m.emphasize("key", "pulse", { at: "after:line+0.1" });
```

## Feature list (3–5 items)
```ts
m.enter(["f1", "f2", "f3"], "rise", { at: "b2", stagger: "list", distance: 32 });
// later, focus one:
m.emphasize("f2", "glow", { at: "b3" });
```

## Stat reveal
```ts
m.enter("stat", "scalePop", { at: "b1" });
m.counter("stat", { from: 0, to: 98.6, decimals: 1, suffix: "%", at: "b1", duration: "linger" });
m.enter("statLabel", "rise", { at: "b1+0.3", distance: 20 });
```

## Logo resolve / end card
```ts
m.enter("logo", "zoomIn", { at: "b1" });                       // big → settle, defocus → focus
m.enter("wordmark", "trackIn", { at: "b1+0.25", tracking: -0.02 });
m.enter("cta", "rise", { at: "after:wordmark", distance: 16 });
m.loop("glow", { scale: 0.04 }, { period: 6 });
```

## UI card / window entrance
```ts
m.enter("window", "rise", { at: "b1", distance: 96, ease: "enter", duration: "hero" });
m.tween("window", { rotateX: [12, 0] }, { at: "b1", duration: "hero", ease: "enter" }); // subtle tilt settle
m.enter(["row1", "row2", "row3"], "fade", { at: "after:window-0.3", stagger: "list" });
```

## Marker highlight
```tsx
// view
<Headline ct="headline">Ship <Highlight ct="hl">faster</Highlight>.</Headline>
```
```ts
m.enter("headline", "maskUp", { at: "b1", split: "lines" });
m.emphasize("hl-bar", "underline", { at: "after:headline" });
```

## Quote
```ts
m.enter("quote", "fadeBlur", { at: "b1", split: "lines", stagger: "line" });
m.enter("author", "fade", { at: "after:quote+0.1" });
```

## Exit choreography (when you must clear the stage within a scene)
```ts
m.exit(["subhead", "headline"], "sinkOut", { at: "b3", stagger: 0.06 }); // reverse order of entry
```
