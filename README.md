# rn-conventions-mcp

A local MCP server that exposes personal React Native / Expo project
conventions as resources: commit & branch conventions, the AI-attribution
default, the CI-verification policy, the `.web.tsx` platform-split rule,
CLAUDE.md writing style, and reusable tooling/CI templates (oxlint,
oxfmt, eslint, knip, CI workflow YAML, a GitHub Pages web-deploy
workflow).

Point-in-time snapshot of what's already wired up on
[mobile-portofolio](https://github.com/arberhh/mobile-portofolio),
generalized for reuse — kept here instead of copy-pasted into every new
project.

## What's inside

```
resources/
  docs/
    commit-conventions.md              # type prefixes, branch naming, ticket IDs
    ai-attribution.md                  # default: no AI attribution in commits/PRs
    ci-verification-policy.md          # don't re-run checks locally after a task
    react-native-web-platform-split.md # .web.tsx over inline Platform.OS checks
    claude-md-style.md                 # how to write a project's CLAUDE.md
    tooling-stack.md                   # oxlint/eslint/oxfmt/tsc/jest/knip, why this split
  tooling/
    oxlintrc.json, oxfmtrc.json
    eslint.config.expo.js              # + eslint-plugin-expo rules
    eslint.config.rn-cli.js            # bare RN CLI variant, no Expo plugin
    knip.expo.json                     # classic Expo (single App.tsx entry)
    knip.expo-router.json              # Expo Router (file-based app/ entries)
    knip.rn-cli.json
  ci/
    ci.expo.yml                        # type-check/lint/format/test/web-build/deadcode
    ci.rn-cli.yml                      # same minus web build; commented native build jobs
    deploy-web-gh-pages.yml            # gh-pages branch deploy, Expo-web specific
```

Every file under `resources/` is exposed as an MCP resource at
`rn-conventions://<category>/<filename>`. A `list_conventions` tool lists
them, optionally filtered by `category` (`docs` | `tooling` | `ci`).

## Setup

```bash
npm install
npm run build
```

## Use in another project

From the target project's directory:

```bash
claude mcp add rn-conventions -- node /Users/arberhaxhimusa/Desktop/Dev/rn-conventions-mcp/dist/index.js
```

That registers it as a project-scoped (or pass `-s user` for a
user-level) MCP server. Once connected, ask Claude Code to read a
resource (e.g. "check the rn-conventions MCP for this repo's commit
convention") or copy a tooling/CI template in as a starting point —
adapt filenames/paths to the target project rather than dropping them in
verbatim, since e.g. `knip.expo.json` vs `knip.rn-cli.json` assumes a
specific entry point.

## Updating

These are point-in-time snapshots, not synced automatically from any
project. When a convention changes somewhere real, update the
corresponding file here by hand (`resources/docs/*.md` for rules,
`resources/tooling/*` / `resources/ci/*` for templates) and rebuild
(`npm run build`) — MCP clients pick up resource content changes on next
read, no reconnect needed for content, though a client may need to
reconnect to see newly *added* resources.
