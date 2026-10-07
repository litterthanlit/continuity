import tseslint from "typescript-eslint";

/**
 * Determinism rules for anything that runs inside a frame: motion must be a
 * pure function of time. Wall clocks, randomness, timers and CSS
 * animations/transitions all break seek-based rendering.
 */
const determinism = {
  "no-restricted-properties": [
    "error",
    { object: "Date", property: "now", message: "Non-deterministic. Motion is a pure function of time — declare it in motion()." },
    { object: "Math", property: "random", message: "Non-deterministic. Derive variation from an index or a fixed seed." },
    { object: "performance", property: "now", message: "Non-deterministic." },
  ],
  "no-restricted-globals": [
    "error",
    { name: "requestAnimationFrame", message: "Frames are seeked, not played. Declare motion in motion()." },
    { name: "setTimeout", message: "No timers: frames are seeked, not played." },
    { name: "setInterval", message: "No timers: frames are seeked, not played." },
  ],
  "no-restricted-syntax": [
    "error",
    { selector: "NewExpression[callee.name='Date']", message: "Non-deterministic date." },
    {
      selector: "Literal[value=/(^|[;{\\s])(animation|transition)\\s*:/]",
      message: "CSS animations/transitions run on the wall clock and break seeking. Use motion().",
    },
    {
      selector: "JSXAttribute[name.name=/^(class|className)$/] > Literal[value=/(^|\\s)(animate-[a-z]|transition($|\\s|-))/]",
      message: "Tailwind animate-*/transition-* utilities run on the wall clock. Use motion().",
    },
  ],
};

export default tseslint.config(
  { ignores: ["node_modules/", "build/", "out/", "**/.continuity/", ".scratch/", "**/snapshots/"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: ["projects/**/*.{ts,tsx}", "src/kit/**/*.{ts,tsx}", "src/motion/**/*.ts", "src/runtime/**/*.ts"],
    rules: determinism,
  },
);
