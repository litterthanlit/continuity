# seo-agent-launch: before vs after the launch devices

Brief `bench/briefs/seo-agent-launch.md`. Before = harness at origin/main 158774a; after = branch
`claude/read-this-357ru2`. Same brief, same default model, same runner. Judged blind by two `critic`
agents per round, films shown in opposite orders, on the critique skill's five axes.

## Round 1 (runs 202611040950 / 202611040951, 14s demo track)

| Critic | After | Before |
|---|---|---|
| before shown first | 3.2 | 3.4 |
| after shown first | 3.0 | 3.2 |

The before film won both orders. Causes in the after film, all fixed since:
- the ring's arc never drew (`hue="accent"` silently rendered nothing) → unknown hues now fail the build;
- the "before" grid was blank (DotGrid had no before) → `<DotGrid from={before}>`;
- the pixels transition mixed both scenes' type → it now cuts through the canvas;
- the brief's 14s track went silent at 13.7s in both films → `bench/assets/launch.wav` (40s).

## Round 2 (runs 202611041019 / 202611041020, 40s launch track)

| Critic | After | Before |
|---|---|---|
| after shown first | **4.2** (I5 C4 Ty4 Te4 Cr4) | 2.8 (I3 C3 Ty2 Te3 Cr3) |
| before shown first | **4.0** (4 4 4 4 4) | 3.0 (3 3 2 4 3) |

The after film wins both orders: every must-show present, including the music stop (about -15 dB
before the end card's cut, -90 dB after), the retype on one baseline, the 26×7 grid filling from
its before and turning to dots. The before film missed the music stop (it cannot express one) and
set its retyped endings on a second baseline for about 10s.

Gates: the after film 0 errors, 1 warning. The before film's gate never ran: `ct check` timed out
on its long soundtrack (a probe bug, fixed in this branch). The after run's agent patched that probe
line mid-run to pass its own gate; the bench now denies runs any edit outside `projects/`.

Open defects in the after film, for the next round: the phone runs outside title-safe (22–25s),
the end card holds 2.4s with no motion after the stop, the music stops as the depth-out into the
end card begins (about 0.5s before the card is fully on screen), and the graph headline collides
with the grid on entrance (27.3s).

Verdict: keep the change.
