# JS/TS tooling stack

The default stack for these projects, and the reasoning behind the split
between `oxlint` and `eslint` specifically:

- **oxlint** — fast, broad-coverage linter (correctness rules,
  `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`). Run with
  `--deny-warnings` in CI so warnings fail the build, not just errors.
- **eslint** — runs *after* oxlint, scoped narrowly to rules oxlint
  doesn't implement yet: `eslint-plugin-react-native` (color literals,
  inline styles, raw text, unused styles, sort-styles,
  split-platform-components) and, on Expo projects,
  `eslint-plugin-expo` (`use-dom-exports`, `no-env-var-destructuring`,
  `no-dynamic-env-var`). Run with `--max-warnings=0`. See
  `tooling/eslint.config.expo.js` / `tooling/eslint.config.rn-cli.js`.
- **oxfmt** — formatter (`oxfmt .` to write, `oxfmt --check .` for CI).
  Wire it into a pre-commit hook so staged files are formatted before
  they're committed, rather than relying on CI to catch formatting
  drift after the fact:

  ```sh
  # .githooks/pre-commit, installed via `npm run prepare` running
  # `git config core.hooksPath .githooks`
  if git diff --cached --quiet --diff-filter=ACMR; then
    exit 0
  fi
  git diff --cached --name-only --diff-filter=ACMR -z | xargs -0 ./node_modules/.bin/oxfmt --no-error-on-unmatched-pattern
  git diff --cached --name-only --diff-filter=ACMR -z | xargs -0 git add
  ```
- **tsc** — type check only (`tsc --noEmit`, or a bare `tsc` if `noEmit`
  is already set in `tsconfig.json`), no bundling.
- **jest** (+ `jest-expo` preset on Expo projects, `@testing-library/react-native`
  for component tests) — unit/component tests, run with `--ci` in CI.
- **knip** — dead-code / unused-exports / unused-deps scan. Point
  `entry` at the actual app entry point(s) — `App.tsx` for Expo,
  `index.js` + `App.tsx` for bare RN CLI (see `tooling/knip.expo.json` /
  `tooling/knip.rn-cli.json`).

## The combined `lint` script

```json
"lint": "oxlint --deny-warnings . && eslint . --max-warnings=0"
```

oxlint runs first because it's dramatically faster and catches the bulk
of issues; eslint then only has to check its narrower rule set.

## Where these run

All of the above run in CI (see `ci/ci.expo.yml` / `ci/ci.rn-cli.yml`),
gated on every PR and push to `main`. See `docs/ci-verification-policy.md`
for why they should *not* also be re-run locally as a post-task
verification step.
