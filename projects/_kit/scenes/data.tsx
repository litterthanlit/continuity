import { scene, Stage, Browser, BarChart, LineChart, Stat, Sheen, Card } from "continuity";

export default scene({
  view: () => (
    <Stage bg="aurora">
      <div class="absolute left-[200px] top-[130px]">
        <Browser ct="br" url="continuity.dev/analytics" width={1520} height={820}>
          <div class="grid h-full grid-cols-[1fr_1fr] gap-[32px] p-[44px]">
            <Card ct="c1" class="flex flex-col justify-between">
              <Stat ct="renders" value={1280} label="frames checked per cut" />
              <BarChart ct="bars" data={[30, 46, 38, 62, 55, 80, 96]} width={560} height={300} highlightIndex={6} />
            </Card>
            <Card ct="c2" class="relative flex flex-col justify-between overflow-hidden">
              <Stat ct="score" value={4.6} decimals={1} label="mean critique score" />
              <LineChart ct="trend" data={[2.8, 3.1, 3.0, 3.6, 3.9, 4.2, 4.6]} width={560} height={260} />
              <Sheen ct="sheen" />
            </Card>
          </div>
        </Browser>
      </div>
    </Stage>
  ),
  motion: (m) => {
    m.enter("br", "fadeBlur", { at: "b1" });
    m.enter(["c1", "c2"], "rise", { at: "b1+0.3", distance: 40 });
    m.counter("renders", { from: 0, to: 1280, at: "b2", duration: "linger" });
    m.counter("score", { from: 0, to: 4.6, decimals: 1, at: "b2+0.1", duration: "linger" });
    m.tween(["bars-b0", "bars-b1", "bars-b2", "bars-b3", "bars-b4", "bars-b5", "bars-b6"], { scaleY: [0, 1] }, { at: "b2", duration: "slow", ease: "enter", stagger: "list", kind: "enter" });
    m.enter("trend-line", "draw", { at: "b2+0.2", duration: "linger" });
    m.enter("trend-area", "fade", { at: "b2+0.9", duration: "slow" });
    m.tween("sheen", { xPct: [-160, 360] }, { at: 2.6, duration: "linger", ease: "inOut" });
    m.camera({ scale: [1.02, 1], x: [10, -10] });
  },
});
