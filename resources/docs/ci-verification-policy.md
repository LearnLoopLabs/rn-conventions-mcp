# CI verification policy

**Don't run the full check suite (lint, format check, type check, tests,
build, dead-code scan) after finishing a task — CI runs them on every
push/PR.** Re-running them locally after the fact just burns tokens
re-producing output CI will produce anyway.

## What this means concretely

- Do not run `lint` / `format:check` / `ts:check` / `test` / a full
  build / dead-code (`knip`) commands, or start the dev server, as a
  final "let me verify everything's fine" step once a task is done.
- Do not run `expo start` / `npm run ios` / `npm run android` /
  `npm run web` (or a bare-RN-CLI equivalent) as a wrap-up sanity check
  unless the user explicitly asked to see the app running.

## When it's still fine to run a check

Only run a check yourself when you need its *output* to keep working —
verification is a side effect, not the goal:

- `tsc`/`ts:check` after a risky refactor, to catch type errors before
  making the next edit that depends on the change compiling.
- A single targeted test file after changing the code it covers, to
  confirm the change behaves as intended before moving on.
- `oxfmt`/`prettier` (format, not format:check) if a pre-commit hook
  doesn't already handle it and you want the diff to land pre-formatted.

The distinguishing question: "do I need this command's output to make my
next decision," not "would running this make me more confident the task
is done." The latter is CI's job.

## Why

This is a common, recurring instruction across projects that already
have CI wired up to run these checks on every PR/push — running them
again locally after the fact is redundant work that adds no information
CI won't already surface, at real token cost (build/test/lint output can
run to hundreds of lines).
