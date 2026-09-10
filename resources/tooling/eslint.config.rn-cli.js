// Bare RN CLI variant: same react-native plugin rules as the Expo
// config, minus eslint-plugin-expo. CJS require() below assumes no
// "type": "module" — else rename to .cjs.
const tsParser = require("@typescript-eslint/parser");
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
      "react-native": reactNative,
    },
    rules: {
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
    ignores: ["dist/*", "android/*", "ios/*"],
  },
];
