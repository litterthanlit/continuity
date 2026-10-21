import type { ComponentChildren } from "preact";
import { scene, Stage, Headline, El } from "continuity";
import { push, TypeStack, TOP } from "../lib/layout.js";
import storyboard from "../storyboard.json" with { type: "json" };

/** Copy of another scene, straight from the storyboard, so the miniatures never drift from the film. */
const copy = (id: string, key: string): string =>
  (storyboard.scenes.find((s) => s.id === id)?.text as Record<string, string> | undefined)?.[key] ?? "";

// A frame of this very video at contact-sheet scale: 192 × 341, i.e. 1080 × 1920 × K.
const W = 192;
const H = 341;
const GAP = 12;
const K = W / 1080;
const px = (n: number) => `${Math.round(n * K)}px`;

type Ink = "fg" | "grey";
interface Frame {
  scene: string;
  /** Storyboard text keys per line; several keys share a line (blind's "But they can't"). */
  lines: Array<[keys: string | string[], ink: Ink]>;
  lit?: boolean;
  caret?: boolean;
  tick?: boolean;
  /** The eyes frame shows the sheet itself, in miniature. */
  sheet?: boolean;
  /** A word that sits in the grey inside an fg line (blind's "see"). */
  greyWord?: string;
  end?: boolean;
}

/** The sheet, in film order and in each frame's settled ink — as `ct sheet` would sample it. */
const FRAMES: Frame[] = [
  { scene: "hook", lit: true, lines: [["l1", "fg"]] },
  { scene: "hook", lit: true, lines: [["l1", "grey"], ["l2", "fg"]] },
  { scene: "write", lines: [["l1", "fg"]] },
  { scene: "write", lines: [["l1", "grey"], ["l2", "fg"]], caret: true },
  { scene: "blind", lines: [[["l1", "l2"], "fg"], ["l3", "fg"]], greyWord: "see" },
  { scene: "eyes", lines: [["l1", "grey"], ["l2", "fg"]], sheet: true },
  { scene: "check", lines: [["l1", "grey"], ["l2", "fg"]], tick: true },
  { scene: "end", lit: true, lines: [], end: true },
];

function Line({ text, ink, greyWord }: { text: string; ink: Ink; greyWord?: string }) {
  const i = greyWord ? text.indexOf(greyWord) : -1;
  const body: ComponentChildren =
    i < 0 ? text : (
      <>
        {text.slice(0, i)}
        <span class="text-fg-muted">{greyWord}</span>
        {text.slice(i + greyWord!.length)}
      </>
    );
  return <div class={ink === "fg" ? "text-fg" : "text-fg-muted"}>{body}</div>;
}

/** Decorative (data-layout-ignore): the miniature copy is imagery, not reading text. */
function Tile({ ct, f }: { ct: string; f: Frame }) {
  const type = `font-display text-[${px(112)}] leading-[${px(112)}] tracking-[-0.04em]`;
  return (
    <El ct={ct} data-layout-ignore class="relative overflow-hidden rounded-control bg-canvas shadow-raised" style={`width:${W}px;height:${H}px`}>
      {f.lit && <div class="ct-lit absolute inset-0" />}
      {f.end ? (
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center" style={`padding-bottom:${px(154)}`}>
          <div class={`${type} text-fg`}>{copy("end", "wordmark")}</div>
          <div class="mt-[6px] text-[7px] leading-[9px] text-fg-muted">{copy("end", "tagline")}</div>
        </div>
      ) : (
        <div class={`absolute ${type}`} style={`left:${px(86)};top:${px(230 + TOP)}`}>
          {f.lines.map(([key, ink], n) => {
            const last = n === f.lines.length - 1;
            const line = <Line text={[key].flat().map((k) => copy(f.scene, k)).join(" ")} ink={ink} greyWord={f.greyWord && last ? f.greyWord : undefined} />;
            if (last && (f.caret || f.tick)) {
              return (
                <div class="flex items-end gap-[3px]">
                  {line}
                  {f.caret && <span class="mb-[3px] inline-block h-[15px] w-[2px] bg-focus" />}
                  {f.tick && (
                    <svg width="15" height="13" viewBox="0 0 88 76" fill="none" class="mb-[4px]">
                      <path d="M6 44 L30 68 L82 8" stroke="var(--color-fg)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  )}
                </div>
              );
            }
            return line;
          })}
          {f.sheet && (
            <div class="grid w-fit grid-cols-4" style={`margin-top:${px(64)};gap:${px(GAP)}`}>
              {FRAMES.map(() => (
                <div class="rounded-none border border-line" style={`width:${px(W)};height:${px(H)}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </El>
  );
}

const TILES = FRAMES.map((_, i) => `t${i + 1}`);

export default scene({
  view: ({ text }) => (
    <Stage>
      <TypeStack
        below={
          <div class="relative grid w-fit grid-cols-4" style={`gap:${GAP}px`}>
            {FRAMES.map((f, i) => (
              <Tile ct={TILES[i]} f={f} />
            ))}
            {/* litt's focus ring: what the agent is looking at. It glides frame to frame. */}
            <El
              ct="focus"
              data-layout-ignore
              class="pointer-events-none absolute left-0 top-0 rounded-control shadow-focus"
              style={`width:${W}px;height:${H}px`}
            />
          </div>
        }
      >
        <Headline ct="l1">{text.l1}</Headline>
        <Headline ct="l2">{text.l2}</Headline>
      </TypeStack>
    </Stage>
  ),
  motion: (m, ctx) => {
    m.enter("l1", "maskUp", { at: "b1", split: "lines" });
    m.enter("l2", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.enter(TILES, "rise", { at: "b2", stagger: "grid" });
    m.emphasize("l1", "dim", { at: "b2" });
    // The agent reads its own sheet: the ring appears at the instant tier, then glides on the responsive spring.
    m.tween("focus", { opacity: [0, 1] }, { at: "b3", duration: "instant", ease: "out", kind: "emphasis" });
    const pitch = W + GAP;
    m.tween("focus", { x: [0, pitch] }, { at: "b3+0.35" });
    m.tween("focus", { x: [null, pitch * 2] }, { at: "b3+0.7" });
    m.tween("focus", { x: [null, pitch * 3] }, { at: "b3+1.05" });
    push(m, ctx);
  },
});
