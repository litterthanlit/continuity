import { scene, Stage, Gl } from "continuity";
import { MARK } from "../lib/mark.js";

// Glass needs something to bend: litt's hairline grid on a card behind it. The bevels bend the
// lines, so it reads as glass at once and the mark leads; the tagline is said once, at the end.
// The whip sweeps the refraction across the grid on the hit; the material stays still. The card
// overfills the frame so the orbit never shows its edge.
export default scene({
  view: () => (
    <Stage bg="none">
      <Gl
        ct="shot"
        objects={[
          { ct: "card", geometry: { kind: "plane", width: 2880, height: 1620, texture: "grid" }, material: { preset: "satin" }, z: -420 },
          { ct: "mark", geometry: { kind: "extrude", path: MARK, size: 560, depth: 170, bevel: 8 }, material: { preset: "glass" } },
        ]}
        post={{ grain: 0.035, vignette: 0.35 }}
      />
    </Stage>
  ),
  motion: (m) => {
    m.tween("mark", { rotateY: [48, -14] }, { at: "hit", ease: "whip", duration: 1, kind: "enter" });
    m.tween("shot-camera", { rotateY: [-4, 3] }, { at: 0, ease: "out", duration: 1, kind: "camera" });
  },
});
