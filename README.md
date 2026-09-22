# rn-conventions-mcp

[![npm version](https://img.shields.io/npm/v/rn-conventions-mcp)](https://www.npmjs.com/package/rn-conventions-mcp)
[![license](https://img.shields.io/npm/l/rn-conventions-mcp)](LICENSE)

Install / usage page: https://learnlooplabs.github.io/rn-conventions-mcp/

An MCP server that exposes personal React Native / Expo project
conventions as resources: commit & branch conventions, the AI-attribution
default, the CI-verification policy, the `.web.tsx` platform-split rule,
code comment style, CLAUDE.md writing style, and reusable tooling/CI
templates (oxlint, oxfmt, eslint, knip, CI workflow YAML, a GitHub Pages
web-deploy workflow).

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
    comment-style.md                   # avoid verbose doc-blocks, self-documenting code
    claude-md-style.md                 # how to write a project's CLAUDE.md
    tooling-stack.md                   # oxlint/eslint/oxfmt/tsc/jest/knip, why this split
    architecture-baseline.md           # New Arch: assumed on. React Compiler: check, don't assume.
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

Two MCP prompts drive the two actual workflows this server is for:
- `bootstrap-new-project` (arg: `projectType` —
  `expo-router` | `classic-expo` | `bare-rn-cli`) — checklist for
  scaffolding a brand-new project.
- `retrofit-existing-project` — checklist for auditing an existing
  project against these conventions and proposing an additive plan,
  never a blind overwrite.

Both start by checking `architecture-baseline.md`: New Architecture is
assumed on (it's no longer a real choice on current RN versions), React
Compiler is checked for rather than assumed, since it's still opt-in and
changes how memoization should be handled.

## Setup

```bash
npm install
npm run build
```

## Use in another project

From the target project's directory:

```bash
claude mcp add rn-conventions -- npx -y rn-conventions-mcp
```

That registers it as a project-scoped (or pass `-s user` for a
user-level) MCP server. Once connected, ask Claude Code to read a
resource (e.g. "check the rn-conventions MCP for this repo's commit
convention") or copy a tooling/CI template in as a starting point —
adapt filenames/paths to the target project rather than dropping them in
verbatim, since e.g. `knip.expo.json` vs `knip.rn-cli.json` assumes a
specific entry point.

For other MCP clients (Claude Desktop, etc.), add to the client's MCP
config instead:

```json
{
  "mcpServers": {
    "rn-conventions": {
      "command": "npx",
      "args": ["-y", "rn-conventions-mcp"]
    }
  }
}
```

### Local development

To point at a local checkout instead of the published package (e.g. while
editing conventions before a release):

```bash
claude mcp add rn-conventions -- node /Users/arberhaxhimusa/Desktop/Dev/rn-conventions-mcp/dist/index.js
```

## Updating

These are point-in-time snapshots, not synced automatically from any
project. When a convention changes somewhere real, update the
corresponding file here by hand (`resources/docs/*.md` for rules,
`resources/tooling/*` / `resources/ci/*` for templates) and rebuild
(`npm run build`) — MCP clients pick up resource content changes on next
read, no reconnect needed for content, though a client may need to
reconnect to see newly *added* resources.

## Releasing

Publishing to npm is automated via [`.github/workflows/publish.yml`](.github/workflows/publish.yml),
triggered on any `v*` tag push:

```bash
npm version patch   # or minor/major — bumps package.json and creates a git tag
git push --follow-tags
```

Requires an `NPM_TOKEN` (npm Automation token) configured as a repo
secret under Settings → Secrets and variables → Actions.
