import { defineTheme, themes } from "continuity";

// Brand: ONE violet accent (brief). mono-dark's aurora/mesh backgrounds use
// accent-2 (teal) as a second light source — fold it into the accent.
export default defineTheme("mono-dark", {
  colors: { "accent-2": themes["mono-dark"].colors.accent },
});
