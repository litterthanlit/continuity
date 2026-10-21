import { scene, Stage, Browser, BarChart, LineChart, Stat, Card, Segmented } from "continuity";

export default scene({
  view: () => (
    <Stage>
      <div class="absolute left-[192px] top-[128px]">
        <Browser ct="br" url="continuity.dev/analytics" width={1536} height={832}>
          <div class="flex h-full flex-col gap-[32px] p-[48px]">
            <Segmented ct="range" items={["Day", "Week", "Month"]} active={0} />
            <div class="grid flex-1 grid-cols-[1fr_1fr] gap-[32px]">
              <Card ct="c1" class="flex flex-col justify-between">
                <Stat ct="renders" value={1280} label="Frames checked per cut" delta="Up 12% on last week" deltaTone="success" />
                <BarChart ct="bars" data={[30, 46, 38, 62, 55, 80, 96]} width={560} height={240} />
              </Card>
              <Card ct="c2" class="flex flex-col justify-between">
                <Stat ct="score" value={4.6} decimals={1} label="Mean critique score" unit="/ 5" />
                <LineChart ct="trend" data={[2.8, 3.1, 3.0, 3.6, 3.9, 4.2, 4.6]} width={560} height={240} />
              </Card>
            </div>
          </div>
        </Browser>
      </div>
    </Stage>
  ),
  motion: (m) => {
    m.enter("br", "settle", { at: "b1" });
    m.enter(["c1", "c2"], "rise", { at: "b1+0.2" });
    m.counter("renders", { from: 0, to: 1280, at: "b2", duration: "linger" });
    m.counter("score", { from: 0, to: 4.6, decimals: 1, at: "b2+0.1", duration: "linger" });
    m.enter(["bars-b0", "bars-b1", "bars-b2", "bars-b3", "bars-b4", "bars-b5", "bars-b6"], "grow", { at: "b2", stagger: "list" });
    m.enter("trend-line", "draw", { at: "b2+0.2", duration: "linger" });
    m.enter("trend-dot", "fade", { at: "after:trend-line" });
    // The selection glides to "Week" (P12), and the labels change ink at the instant tier.
    m.tween("range-thumb", { x: [0, 200] }, { at: 2.6 });
    m.emphasize("range-s1", "ink", { at: 2.6 });
    m.emphasize("range-s0", "dim", { at: 2.6 });
    m.camera({ scale: [1, 1.02] });
  },
});
