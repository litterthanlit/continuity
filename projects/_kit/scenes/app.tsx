import { scene, Stage, Window, Sidebar, List, Cursor, Toast, Pill } from "continuity";

export default scene({
  view: () => (
    <Stage bg="grid">
      <div class="absolute left-[220px] top-[150px]">
        <Window ct="win" title="Continuity — Projects" width={1480} height={780}>
          <div class="flex h-full">
            <Sidebar ct="nav" items={["Inbox", "Projects", "Renders", "Reviews"]} active={1} />
            <div class="flex-1">
              <div class="flex items-center gap-[16px] px-[28px] py-[22px]">
                <span class="font-sans text-[34px] font-semibold text-fg">Launch videos</span>
                <Pill ct="pill" dot="positive">3 passing</Pill>
              </div>
              <List
                ct="rows"
                rows={[
                  { title: "Hero — headline reveal", meta: "4.2s", status: "positive" },
                  { title: "Feature grid cascade", meta: "6.0s", status: "positive" },
                  { title: "Pricing stat counter", meta: "3.5s", status: "warning" },
                  { title: "End card + CTA", meta: "2.8s", status: "positive" },
                ]}
              />
            </div>
          </div>
        </Window>
        <Cursor ct="cursor" class="left-[900px] top-[640px]" />
      </div>
      <div class="absolute bottom-[100px] right-[150px]">
        <Toast ct="toast" title="Render complete" body="example-type · 14.7s · QC clean" />
      </div>
    </Stage>
  ),
  motion: (m) => {
    m.enter("win", "rise", { at: "b1", distance: 80, duration: "hero" });
    m.tween("win", { rotateX: [10, 0] }, { at: "b1", duration: "hero", ease: "enter", kind: "enter" });
    m.enter(["nav-i0", "nav-i1", "nav-i2", "nav-i3"], "fade", { at: "b2", stagger: "list" });
    m.enter(["rows-r0", "rows-r1", "rows-r2", "rows-r3"], "rise", { at: "b2+0.1", stagger: "list", distance: 18 });
    m.enter("pill", "scalePop", { at: "b2+0.45" });
    m.enter("cursor", "fade", { at: "b2+0.3" });
    m.path("cursor", [{ x: -280, y: -330 }], { at: "click-0.75", duration: "slow" });
    m.click("cursor", { at: "click" });
    m.emphasize("rows-r2", "glow", { at: "click+0.05" });
    m.enter("toast", "rise", { at: "click+0.35", distance: 40, ease: "snappy" });
    m.camera({ scale: [1, 1.03] });
  },
});
