import { scene, Stage, Gl } from "continuity";
import { MARK } from "../lib/mark.js";

// Glass needs something to bend: a line of type on a card behind it. The mark turns slowly
// through the shot, so the refraction moves while the material stays still.
export default scene({
  view: () => (
    <Stage bg="none">
      <Gl
        ct="shot"
        objects={[
          { ct: "type", geometry: { kind: "plane", width: 2400, height: 1350, texture: { text: "motion,\nas code", size: 340, ink: "fg" } }, material: { preset: "satin" }, z: -420 },
          { ct: "mark", geometry: { kind: "extrude", path: MARK, size: 560, depth: 170, bevel: 18 }, material: { preset: "glass" } },
        ]}
      />
    </Stage>
  ),
  motion: (m) => {
    m.tween("mark", { rotateY: [18, -14] }, { at: "hit", ease: "whip", duration: 1, kind: "enter" });
    m.tween("shot-camera", { rotateY: [-4, 3] }, { at: 0, ease: "inOut", duration: 1, kind: "camera" });
  },
});
