import { scene, Stage, Window, Sidebar, List, Cursor, Toast, Tag, Title } from "continuity";

export default scene({
  view: () => (
    <Stage>
      <div class="absolute left-[208px] top-[144px]">
        <Window ct="win" title="Continuity" width={1504} height={784}>
          <div class="flex h-full">
            <Sidebar ct="nav" heading="Studio" items={["Inbox", "Projects", "Renders", "Reviews"]} active={1} />
            <div class="flex-1">
              <div class="flex items-center gap-[16px] px-[32px] py-[24px]">
                <Title ct="title" as="p" size="body">Launch videos</Title>
                <Tag ct="tag" tone="success">3 passing</Tag>
              </div>
              <List
                ct="rows"
                rows={[
                  { title: "Hero headline reveal", meta: "4.2s", tag: "Passing", tone: "success" },
                  { title: "Feature grid cascade", meta: "6.0s", tag: "Passing", tone: "success" },
                  { title: "Pricing stat counter", meta: "3.5s", tag: "1 warning", tone: "warning" },
                  { title: "End card", meta: "2.8s", tag: "Passing", tone: "success" },
                ]}
              />
            </div>
          </div>
        </Window>
        <Cursor ct="cursor" class="left-[900px] top-[640px]" />
      </div>
      <div class="absolute bottom-[96px] right-[144px]">
        <Toast ct="toast" title="Render complete" body="example-type · 13.2s · QC clean" />
      </div>
    </Stage>
  ),
  motion: (m) => {
    // The product is placed: the scene's one expressive moment.
    m.enter("win", "settle", { at: "b1" });
    m.enter(["nav-i0", "nav-i1", "nav-i2", "nav-i3"], "fade", { at: "b2", stagger: "list" });
    m.enter(["rows-r0", "rows-r1", "rows-r2", "rows-r3"], "rise", { at: "b2+0.1", stagger: "list" });
    m.enter("tag", "fade", { at: "b2+0.3" });
    m.enter("cursor", "fade", { at: "b2+0.3" });
    m.path("cursor", [{ x: -272, y: -336 }], { at: "click-0.75", duration: "slow" });
    m.click("cursor", { at: "click" });
    m.enter("toast", "rise", { at: "click+0.3" });
    m.camera({ scale: [1, 1.03] });
  },
});
