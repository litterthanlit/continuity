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

## Variable-axis type (flexion / wonk / swiss)
```ts
// letters settle from wide, then a width wave breathes through the line (flexion)
m.enter("title", "widthIn", { at: "b1", split: "chars", stagger: "char" });
m.emphasize("title", "widthPulse", { at: "b1+1.6", split: "chars", stagger: "char" });
// weight swells in on a one-line statement (keep it nowrap or split it)
m.enter("statement", "weightIn", { at: "b1", split: "words", stagger: "word" });
// serifs soften as the line lands (wonk)
m.enter("title", "maskUp", { at: "b1", split: "lines" });
m.tween("title", { soft: [0, 100] }, { at: "b1", duration: "linger", ease: "hero", kind: "emphasis" });
```

## Transition languages (storyboard)
```jsonc
// Camera-first product: every feature arrives the way you read
{ "type": "push", "dir": "left", "blur": true }      // between features (primary)
{ "type": "whip", "dir": "left" }                     // the one fast beat
// Swiss cuts: cut on the beat; chapters breathe
{ "type": "cut" } · { "type": "dip", "duration": 0.5 } · { "type": "wipe", "feather": 12 }
// Luminous: soft continuity, one light moment
{ "type": "blur" } · { "type": "crossfade" } · { "type": "lightSweep", "color": "accent" }  // into the logo, once
// Kinetic / social punch (9:16): cuts on the beat + two accents
{ "type": "punchCut" } · { "type": "whip", "dir": "up", "duration": 0.28 } · { "type": "strips", "n": 6 }
// Lit precision (litt): crossfade between scenes, one dip into the end card, cuts on the beat
{ "type": "crossfade", "duration": 0.4 } · { "type": "dip", "duration": 0.4, "ease": "standard" } · { "type": "cut" }
```

## Lit precision (litt / litt-light)
```ts
// responsive: base + standard, 32px rise (litt's 16px)
m.enter("headline", "rise", { at: "b1", distance: 32, duration: "base", ease: "standard" });
// a list: say the stagger (arrays default to list = 80ms); 3 rows land within 0.1s of each other
m.enter(["r1", "r2", "r3"], "rise", { at: "after:headline-0.2", distance: 32, duration: "base", ease: "standard", stagger: "grid" });
// expressive: snappy at slow. The scene's ONE; everything else stays responsive or instant
m.enter("card", "scalePop", { at: "b2" });
// instant: press to 0.98 and release around the click
m.tween("cta", { scale: [1, 0.98] }, { at: "b3", duration: "instant", ease: "standard" });
m.tween("cta", { scale: [0.98, 1] }, { at: "b3+0.12", duration: "instant", ease: "standard" });
// exit: one token down from the entrance (slow -> base), decelerating, no bounce
m.exit("card", "fadeOut", { at: "b4", duration: "base", ease: "standard" });
// never: m.loop("bg", …), a drifting <Glow>, Sheen, blur or filter presets: material doesn't move
```
