# React Native Web: platform-specific code

Prefer a separate `ComponentName.web.tsx` file (React Native's standard
per-platform file resolution — also picked up by Metro/RN-CLI, not just
Expo) over an inline `Platform.OS === "web"` / `Platform.select` check.

Only use an inline check when the difference really is tiny — e.g. a
single style property. Anything more than that (a different layout,
hover/cursor handling, sticky positioning, or any other web-only
behavior with no native equivalent) should be split into its own
`.web.tsx` file.

## Why

Keeps platform-specific logic physically separated rather than scattered
through shared components with conditionals. A reader opening
`ComponentName.tsx` sees only native behavior; `ComponentName.web.tsx`
sees only web behavior — no branching to mentally execute.

## How to apply

When adding any behavior or styling that differs between web and native:

1. Default to creating `ComponentName.web.tsx` alongside the existing
   `ComponentName.tsx` (native/default) file.
2. Keep the native file a plain passthrough when web is the only platform
   that needs different behavior (e.g. `export default function X({
   children }) { return <>{children}</>; }`).
3. Reserve inline `Platform.OS` checks for genuinely trivial one-line
   differences — not layout, not conditional rendering of whole
   subtrees.

This applies to both Expo (`bundler: "metro"`) and bare React Native CLI
projects using `react-native-web` — the `.web.tsx` resolution is a Metro
behavior, not an Expo-specific feature.
