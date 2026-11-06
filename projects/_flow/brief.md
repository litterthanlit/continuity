# Flow gallery (reference)

The moves that carry the eye *through* a cut instead of stopping at it (docs/decisions/0010):

1. **portal in** — `grid` → `detail`: the camera goes through the middle tile; the next scene is
   what was inside it, opening from the tile's rounded rect.
2. **carry** — `detail` → `next`: a cut on movement. The camera is already travelling left when
   the cut lands and the next shot decelerates from that speed.
3. **portal out** — `next` → `device`: a pull-back. The scene shrinks into the window it was
   playing on.

Judge each at its mid-point: `npx ct stills _flow --at <times>` and `npx ct strip _flow --scene <id>`.
This is a reference reel, not a film.
