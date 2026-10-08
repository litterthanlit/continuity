import { existsSync, readdirSync } from "node:fs";
import { sourceHash } from "../../build/hash.js";
import { rel } from "../../paths.js";
import { requireSlug } from "../lib/args.js";
import type { Command } from "../lib/command.js";
import { color, log } from "../lib/log.js";
import { iterationDir, readState } from "../lib/store.js";

export const status: Command = {
  name: "status",
  summary: "Iteration history: gate results, renders, scores, verdicts and the current best.",
  usage: "ct status <project>",
  async run(a) {
    const slug = requireSlug(a);
    const s = readState(slug);
    const { combined } = sourceHash(slug);
    if (!s.iterations.length) {
      log("no iterations yet — run `npx ct check " + slug + "`");
      return 0;
    }
    for (const it of s.iterations) {
      const cur = it.hash === combined ? color.cyan(" ← current sources") : "";
      const best = s.best === it.n ? color.green(" ★ best") : "";
      const gate = it.gate ? (it.gate.ok ? color.green(`gate ✔ (${it.gate.warnings}w)`) : color.red(`gate ✖ ${it.gate.errors}e ${it.gate.warnings}w`)) : color.dim("gate —");
      const scores = it.scores ? " scores " + Object.entries(it.scores).map(([k, v]) => `${k[0]}${v}`).join(" ") : "";
      log(`#${it.n} ${it.hash} ${gate}${it.render ? " · " + (it.render.draft ? "draft" : "final") + " render" : ""}${scores}${best}${cur}`);
      const dir = iterationDir(slug, it.n);
      if (existsSync(dir)) {
        const files = readdirSync(dir).filter((f) => f !== "src" && !f.startsWith("."));
        if (files.length) log(color.dim(`    ${rel(dir)}/{${files.join(",")}}`));
      }
      if (it.note) log(color.dim(`    ${it.note}`));
    }
    for (const v of s.verdicts.slice(-5)) log(color.dim(`verdict: #${v.a} vs #${v.b} → #${v.winner} — ${v.reason}`));
    if (!s.iterations.some((i) => i.hash === combined)) log(color.yellow("sources changed since the last iteration — run `npx ct check " + slug + "`"));
    return 0;
  },
};
