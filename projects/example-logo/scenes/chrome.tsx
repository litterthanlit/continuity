import { scene, Stage, Gl } from "continuity";
import { MARK } from "../lib/mark.js";

// The first hit: chrome under litt's light from above. The mark whips round (85% of the turn in
// 1.5 frames) and drifts, landing turned so the extrusion shows, its face tilted up a touch: the
// studio's bright horizon line crosses the face and sweeps down it as the whip lands (tilted
// down, the face mirrors the dark floor and reads as black lacquer).
export default scene({
  view: () => (
    <Stage bg="none">
      <Gl
        ct="shot"
        objects={[{ ct: "mark", geometry: { kind: "extrude", path: MARK, size: 520, depth: 150, bevel: 16 }, material: { preset: "chrome" } }]}
        post={{ grain: 0.035, vignette: 0.35 }}
      />
    </Stage>
  ),
  motion: (m) => {
    m.tween("mark", { rotateY: [-40, -14], rotateX: [6, -2], scale: [0.9, 1] }, { at: "hit", ease: "whip", duration: 1, kind: "enter" });
    m.tween("shot-camera", { z: [0, 80] }, { at: 0, ease: "out", duration: 1, kind: "camera" });
  },
});
