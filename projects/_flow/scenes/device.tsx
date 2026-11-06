import { scene, Label, Safe, Stage, Title, Window } from "continuity";
import { Chapter } from "../lib/frame.js";
import { NEXT_DATA } from "./next.js";

// The window the previous scene was playing in: 16:9 below its title bar, so the pull-back lands
// flush — and it holds that shot's last frame, so the handoff is invisible.
const BODY_W = 1120;
const K = BODY_W / 1920;

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Safe>
        <div class="absolute top-[24px] left-1/2 -translate-x-1/2">
          <Window ct="screen" title="render.mp4" width={BODY_W} height={64 + 1080 * K}>
            <div class="absolute top-0 left-0 h-[1080px] w-[1920px] origin-top-left" style={{ transform: `scale(${K})` }}>
              <Chapter text={{ label: "Carry", title: "Render", sub: "Two shots, one move" }} bg="solid" data={NEXT_DATA} quiet />
            </div>
          </Window>
        </div>
        <div class="absolute bottom-[0px] left-[192px] flex items-baseline gap-[32px]">
          <Label ct="label">{text.label}</Label>
          <Title ct="title">{text.title}</Title>
        </div>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("title", "rise", { at: "b1+0.08" });
  },
});
