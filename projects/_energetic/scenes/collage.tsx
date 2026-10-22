import { scene, Stage, Safe, El, Media, Card, CodeBlock, Stat } from "continuity";

const CODE = `m.enter(pieces, "rise", {
  ease: "pop",
  distance: 96,
});`;

// The collage formula — archive image, code, a data card, then the brand sticker on top —
// in strict containers on the grid. Pieces land on the pop spring, two frames apart; the
// sticker slaps last and the frame holds so the eye can rest before the push.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Safe>
        <Media ct="print" src="assets/print.svg" treat="invert" width={456} height={600} class="absolute left-0 top-0" />
        <Card ct="code" class="absolute left-[488px] top-0 h-[288px] w-[484px] p-[32px]">
          <CodeBlock ct="src" code={CODE} numbers={false} size={26} />
        </Card>
        <Card ct="stat" class="absolute left-[488px] top-[320px] h-[280px] w-[484px] p-[40px]">
          <Stat ct="frames" value={276} label="Frames, seeked" />
        </Card>
        <Media ct="strip" src="assets/stone.svg" treat="mono" width={972} height={340} class="absolute left-0 top-[632px]" />
        <El ct="sticker" class="absolute left-[352px] top-[520px] flex h-[80px] items-center rounded-control bg-fg px-[32px] font-sans text-label font-label text-canvas shadow-float">
          {text.sticker}
        </El>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter(["print", "code", "stat", "strip"], "rise", { at: "b1", distance: 96, ease: "pop", stagger: 0.067 });
    m.tween("sticker", { scale: [1.5, 1], rotate: [-14, -4], opacity: [0, 1] }, { at: "slap", ease: "pop", kind: "enter" });
    m.camera({ scale: [1.02, 1.06] });
  },
});
