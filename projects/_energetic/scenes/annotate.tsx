import { scene, Stage, Safe, El, Media, Marker, Path, Caption } from "continuity";

// Organic subject, technical overlay: the ring drifts inside its frame while numbered
// markers pop onto it and hairlines draw between them. The caption wipes on under a selection block.
export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Safe>
        <Media ct="rings" src="assets/rings.svg" treat="invert" width={972} height={800} class="absolute left-0 top-0">
          <Path ct="link" d="M288 248 L600 392 L432 608" viewBox="0 0 972 800" width={972} height={800} strokeWidth={2} class="absolute inset-0" />
          <Marker ct="n1" label="01" class="left-[288px] top-[248px]" />
          <Marker ct="n2" label="02" class="left-[600px] top-[392px]" />
          <Marker ct="n3" label="03" side="left" class="left-[432px] top-[608px]" />
        </Media>
        <div class="absolute left-0 top-[848px]">
          <Caption ct="caption">{text.caption}</Caption>
          <El ct="sel" class="absolute inset-0 bg-fg" />
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.tween("rings-img", { scale: [1.08, 1] }, { at: 0, duration: "linger", ease: "out" });
    m.enter(["n1", "n2", "n3"], "rise", { at: "b1", distance: 48, ease: "pop", stagger: 0.067 });
    m.enter("link", "draw", { at: "after:n3-0.1", duration: "slow", ease: "steep" });
    // The selection block: it sweeps on, the words are revealed under it, and it leaves to the right.
    m.tween("sel", { clipRight: [100, 0] }, { at: "b2", duration: "snap", ease: "steep", kind: "enter" });
    m.enter("caption", "wipeRight", { at: "b2+0.2", duration: "snap", ease: "steep" });
    m.tween("sel", { clipLeft: [0, 100] }, { at: "after:sel", duration: "snap", ease: "steep" });
    m.camera({ scale: [1, 1.05] }, { origin: { x: 54, y: 54 } });
  },
});
