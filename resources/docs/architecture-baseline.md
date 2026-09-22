# New Architecture and React Compiler: what to assume, what to ask

Two RN/React changes that alter other conventions in this server —
handled differently because one is no longer a real choice and the
other still is.

## New Architecture (Fabric + TurboModules): assume it, don't ask

On any current React Native version, Old Architecture is not a
meaningful fallback — Meta has been removing it from the RN codebase
across recent releases, not just defaulting it off. Treat it as the
only architecture, not a flag to check:

- Native modules: TurboModule specs (Codegen, typed spec files), never
  the legacy `NativeModules`/bridge pattern.
- Native UI components: Fabric components via Codegen, never
  `requireNativeComponent` against the old bridge.
- Animation/gesture libraries: pick versions built for it —
  `react-native-reanimated` 3+, `react-native-gesture-handler` 2+ — both
  assume direct JSI access, not the old async bridge.
- Before adding any native-code third-party dependency, check it
  supports Fabric/TurboModules — some smaller/abandoned libraries never
  migrated and will not work at all, not just suboptimally.
- Confirm it's actually on: `newArchEnabled=true` in
  `android/gradle.properties`, and the iOS equivalent in the Podfile /
  `RCT_NEW_ARCH_ENABLED` env var (Expo: `newArchEnabled` in `app.json`,
  or the default on current SDKs). On a project new enough that this is
  even configurable, there's rarely a reason to turn it off.

## React Compiler: check, don't assume

Unlike New Architecture, this is still an opt-in choice with a real
before/after — check for `babel-plugin-react-compiler` (or
`babel-plugin-react-compiler-native`/an RC-runtime package) in
`babel.config.js` and `package.json` before writing or reviewing any
memoization-related code. Don't guess from the React version alone;
plenty of React 19 RN projects haven't adopted it.

**If the compiler is present:**

- Manual `useMemo`/`useCallback`/`React.memo` become mostly redundant —
  the compiler auto-memoizes components and values that follow the
  Rules of React. Adding them by hand is noise, not safety.
- The compiler silently skips memoizing any component that violates the
  Rules of React (mutating state/props during render, impure render
  functions) — it doesn't error, it just falls back to unmemoized
  behavior for that component. Add `eslint-plugin-react-compiler` (or
  whatever the current React tooling ships) so violations show up as
  lint errors instead of a silent performance cliff.
- Reanimated worklets and the compiler's Babel transform can conflict —
  worklets aren't plain React render code, and plugin ordering in
  `babel.config.js` matters (the reanimated plugin generally needs to
  run last). Verify this combination explicitly rather than assuming it
  works out of the box.

**If it's absent (the common case today):** manual memoization
discipline still applies, and it needs the same judgment it always
did — memoize because a specific re-render is measured or structurally
predictable, not by default. A library doing its own reference-equality
gating (e.g. a virtualized list's cell recycling) already covers what an
extra `React.memo` on the row component would check again; adding one
anyway is dead weight, not extra safety.

## How this feeds the other conventions

Any future convention or lint rule about memoization, native modules, or
animation libraries in this server should state which of these two
states it assumes, since giving one blanket answer across both would be
wrong for whichever project is on the other side of it.
