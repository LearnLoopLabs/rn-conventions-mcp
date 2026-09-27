# Writing a project's CLAUDE.md

Guidance for producing (or updating) a `CLAUDE.md` for a React
Native/Expo project. This is a style guide, not a template to copy
verbatim — every claim in the final file must be grounded in that
project's actual files, not assumed from this pattern.

## Required prefix

```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.
```

## Structure that has worked well

1. **Commands** — the exact `npm run <script>` (or yarn/pnpm equivalent)
   for type-check, lint, format/format-check, test (+ how to run a single
   test file), dead-code scan, and any build/export step. Pull these
   verbatim from `package.json`, don't paraphrase them.
   - If the project has a "prefer targeted checks over a redundant full
     re-run" preference, state it here — see the
     `local-verification-preference` resource for the exact
     wording/rationale to adapt.
2. **Architecture** — organized by subsystem, not by directory listing:
   - **Data flow**: where the API/backend client is instantiated, what
     the one data-fetching pattern is (hook, service layer, whatever it
     actually is — don't assume a library like React Query is present
     unless `package.json` says so), how types are derived.
   - **Navigation/screens**: the route table and any non-obvious split
     (e.g. a screen component split into a reusable "content" piece and
     a route-level wrapper, to support rendering inline on wide layouts).
   - **Web-specific behavior** (if `react-native-web` is a dependency):
     the `.web.tsx` split pattern — see `react-native-web-platform-split`
     resource — and any width-breakpoint logic.
   - **Theming**, **state management**, or other cross-cutting concerns
     that require reading multiple files to piece together.
3. **CI/CD** — one bullet per workflow file in `.github/workflows/`,
   naming the actual file and what it does on what trigger. Include
   secrets/env vars a workflow depends on if they're not obviously named.
4. **Commit/PR conventions** — link or restate the project's commit
   convention (see `commit-conventions` resource) and its AI-attribution
   default (see `ai-attribution` resource) if it differs from the
   platform default.

## Rules

- **Do not repeat yourself** and do not include generic advice
  ("write tests", "handle errors", "don't commit secrets") — that's
  true of every project and teaches nothing project-specific.
- **Do not list every file/component** — that's discoverable with `ls`/
  `grep` in seconds; CLAUDE.md earns its keep by capturing things that
  require reading *multiple* files to piece together (a data flow, a
  layout split, a non-obvious CI dependency), not directory contents.
- **Verify every claim against source before writing it.** A function
  name, a config value, a "this is the only place X happens" claim — grep
  for it, read the file, confirm it's still true. A stale claim is worse
  than no claim.
- If a README, ARCHITECTURE.md, or existing CLAUDE.md already exists,
  read it fully first and fold in what's accurate rather than
  duplicating or contradicting it.
- If Cursor rules (`.cursor/rules/`, `.cursorrules`) or Copilot
  instructions (`.github/copilot-instructions.md`) exist, incorporate
  the parts that are still relevant.
- Don't invent sections like "Common Development Tasks" or "Tips" unless
  the content already exists somewhere in the repo — CLAUDE.md documents
  what's true, it doesn't pad itself with generic advice to look
  complete.
