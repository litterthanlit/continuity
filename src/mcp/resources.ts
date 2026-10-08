import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { PKG_ROOT } from "../paths.js";

/**
 * The studio's knowledge (the plugin's skills) served as MCP resources:
 * continuity://guide/<skill> and continuity://guide/<skill>/<file>.
 */
export interface Guide {
  uri: string;
  name: string;
  title: string;
  description: string;
  file: string;
}

export const GUIDE_DIR = join(PKG_ROOT, "plugin", "skills");

/** The guides speak `npx ct …`; over MCP the same operations are tools. */
export const CLI_TO_TOOLS = `> **Using this guide over MCP:** where it says \`npx ct <command>\`, call the matching tool —
> new → \`new_project\` · lint → \`lint\` · check → \`check\` · timeline → \`timeline\` · stills → \`stills\` ·
> sheet → \`contact_sheet\` · strip → \`motion_strip\` · motion → \`motion_analysis\` · render → \`render\` ·
> status → \`status\` · score → \`score\` · compare → \`compare\` · verdict → \`verdict\` · restore → \`restore\` ·
> report → \`report\` · docs → \`catalog\` · doctor → \`doctor\` · init → \`init_repo\`.
> Read and write project files with \`read_project_file\` / \`write_project_file\` if your client has no file tools.
> "Read the PNG" means look at the images the tool returns.

`;

function frontmatter(md: string): { name?: string; description?: string; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  if (!m) return { body: md };
  const get = (k: string) => new RegExp(`^${k}:\\s*(.*)$`, "m").exec(m[1])?.[1]?.trim();
  return { name: get("name"), description: get("description"), body: md.slice(m[0].length) };
}

export function listGuides(): Guide[] {
  if (!existsSync(GUIDE_DIR)) return [];
  const out: Guide[] = [];
  for (const skill of readdirSync(GUIDE_DIR).sort()) {
    const dir = join(GUIDE_DIR, skill);
    if (!statSync(dir).isDirectory() || !existsSync(join(dir, "SKILL.md"))) continue;
    const fm = frontmatter(readFileSync(join(dir, "SKILL.md"), "utf8"));
    out.push({ uri: `continuity://guide/${skill}`, name: `guide-${skill}`, title: `Guide: ${skill}`, description: fm.description ?? skill, file: join(dir, "SKILL.md") });
    const walk = (d: string) => {
      for (const name of readdirSync(d).sort()) {
        const abs = join(d, name);
        if (statSync(abs).isDirectory()) walk(abs);
        else if (name.endsWith(".md") && abs !== join(dir, "SKILL.md")) {
          const sub = relative(dir, abs).split(sep).join("/");
          out.push({
            uri: `continuity://guide/${skill}/${sub}`,
            name: `guide-${skill}-${sub.replace(/[/.]/g, "-")}`,
            title: `Guide: ${skill} — ${sub}`,
            description: `Reference for the ${skill} guide: ${sub}`,
            file: abs,
          });
        }
      }
    };
    walk(dir);
  }
  return out;
}

export function readGuide(g: Guide): string {
  const md = readFileSync(g.file, "utf8");
  const { body } = frontmatter(md);
  return CLI_TO_TOOLS + body;
}
