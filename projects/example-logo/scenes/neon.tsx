import { scene, Stage, Gl } from "continuity";
import { MARK } from "../lib/mark.js";

// The mark as light: neon tubes in the accent, and bloom — the light spilling, not moving.
export default scene({
  view: () => (
    <Stage bg="none">
      <Gl
        ct="shot"
        objects={[{ ct: "mark", geometry: { kind: "tubes", path: MARK, size: 520, radius: 9 }, material: { preset: "neon", intensity: 4 } }]}
        post={{ bloom: { strength: 1.1, threshold: 0.9, radius: 0.6 }, grain: 0.035, vignette: 0.35 }}
      />
    </Stage>
  ),
  motion: (m) => {
    m.tween("mark", { rotateX: [-12, 0], rotateY: [40, 0] }, { at: "hit", ease: "whip", duration: 1, kind: "enter" });
    m.tween("shot-camera", { z: [0, 140] }, { at: 0, ease: "out", duration: 1, kind: "camera" });
  },
});
