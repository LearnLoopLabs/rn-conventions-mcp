// Runs after oxlint, for RN/Expo-plugin rules oxlint doesn't cover.
// CJS require() below assumes no "type": "module" — else rename to .cjs.
const tsParser = require("@typescript-eslint/parser");
const expo = require("eslint-plugin-expo");
const reactNative = require("eslint-plugin-react-native");

module.exports = [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      expo,
      "react-native": reactNative,
    },
    rules: {
      "expo/use-dom-exports": "error",
      "expo/no-env-var-destructuring": "error",
      "expo/no-dynamic-env-var": "error",
      "react-native/no-color-literals": "error",
      "react-native/no-inline-styles": "error",
      "react-native/no-raw-text": "error",
      "react-native/no-single-element-style-arrays": "error",
      "react-native/no-unused-styles": "error",
      "react-native/sort-styles": "error",
      "react-native/split-platform-components": "error",
    },
  },
  {
    ignores: ["dist/*", ".expo/*"],
  },
];
