import { Headline, Label, NotificationStack, Phone, scene, Safe, Stage } from "continuity";

// The reward beat, shown not told: the night's results arrive on a lock screen, newest on top.
// Notification copy is UI imagery (glanced at), so it lives here with the mockup.
const ITEMS = [
  { title: "Ranked #1", body: "seo for founders" },
  { title: "Demo booked", body: "Northwind, Thursday" },
  { title: "Cited by AI", body: "Best SaaS SEO tools" },
  { title: "Payment received", body: "$490 · Pro, yearly" },
];

export default scene({
  view: ({ text }) => (
    <Stage bg="grid">
      <Safe class="grid grid-cols-[1fr_auto] items-center">
        <div class="flex flex-col gap-[16px]">
          <Label ct="label">{text.label}</Label>
          <Headline ct="headline">{text.headline}</Headline>
        </div>
        <Phone ct="phone" width={440}>
          <div class="flex h-full justify-center pt-[200px]">
            <NotificationStack ct="alerts" items={ITEMS} width={380} rowHeight={120} gap={12} />
          </div>
        </Phone>
      </Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("label", "wipeRight", { at: 0.1, duration: "snap", ease: "steep" });
    m.enter("headline", "wipeRight", { at: 0.2, duration: "snap", ease: "steep" });
    m.stackIn("alerts", { at: "b1", every: 0.55, ease: "steep" });
  },
});
