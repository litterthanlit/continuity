# Continuity — Claude Code plugin

The agent layer of [Continuity](https://github.com/litterthanlit/continuity): a motion
design studio for agents. Pairs with the `ct` CLI from the
[`@litterthanlit/continuity`](https://www.npmjs.com/package/@litterthanlit/continuity) package.

```
/plugin marketplace add litterthanlit/continuity
/plugin install continuity@continuity
/continuity:setup                      # installs the CLI in this repo, runs `npx ct init`
/continuity:make-video <your brief>
```

| Component | What it does |
|---|---|
| `/continuity:make-video` | brief → director → parallel scene-builders → gate → critic → iterate → render |
| `/continuity:iterate` · `/continuity:review` · `/continuity:render` | one improvement round · 5-axis scored review · final render with QC + report |
| `/continuity:setup` | install `@litterthanlit/continuity`, `npx ct init`, toolchain check |
| agents `director` · `scene-builder` · `critic` | storyboard author · one scene each, in parallel · read-only reviewer |
| skills `continuity` · `motion-craft` · `kinetic-type` · `product-launch` · `critique` · `hyperframes-ref` | the loop, motion taste with numbers, genre playbooks, rubric, engine reference |
| hooks | SessionStart toolchain check · `ct lint --fast` after every project edit · Stop blocks "done" until changed projects pass `ct check` |

Hooks are silent no-ops in repos without `continuity.json` or the package.
Plugins can't grant permissions; `npx ct init` adds `Bash(npx ct:*)` to the repo's
`.claude/settings.json`.
