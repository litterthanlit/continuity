import { scene, Stage, Gl } from "continuity";
import { MARK } from "../lib/mark.js";

// Glass needs something to bend: the tagline on a card behind it, smaller than the mark so the
// mark leads. The whip sweeps the refraction across the type on the hit; the material stays still.
// The card overfills the frame so the orbit never shows its edge.
export default scene({
  view: ({ text }) => (
    <Stage bg="none">
      <Gl
        ct="shot"
        objects={[
          { ct: "type", geometry: { kind: "plane", width: 2880, height: 1620, texture: { text: text.type, size: 220, ink: "fg-muted" } }, material: { preset: "satin" }, z: -420 },
          { ct: "mark", geometry: { kind: "extrude", path: MARK, size: 560, depth: 170, bevel: 8 }, material: { preset: "glass" } },
        ]}
      />
    </Stage>
  ),
  motion: (m) => {
    m.tween("mark", { rotateY: [48, -14] }, { at: "hit", ease: "whip", duration: 1, kind: "enter" });
    m.tween("shot-camera", { rotateY: [-4, 3] }, { at: 0, ease: "out", duration: 1, kind: "camera" });
  },
});
