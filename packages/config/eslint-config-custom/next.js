/** @type {import("eslint").Linter.Config} */

// Reference: https://dev.to/mryechkin/streamlining-your-tailwind-css-workflow-with-eslint-prettier-1hg
// eslint-disable-next-line no-undef
module.exports = {
  extends: ["next", "plugin:tailwindcss/recommended", "plugin:storybook/recommended", "./index.js"],
  env: {
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    project: ["./tsconfig.json"],
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["prettier", "@typescript-eslint", "import", "tailwindcss"],
  parser: "@typescript-eslint/parser",

  ignorePatterns: [".eslintrc.js"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "off",
    "prettier/prettier": ["error"],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/prefer-as-const": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: ["../..*"],
      },
    ],
    "prefer-arrow-callback": [
      "error",
      {
        allowNamedFunctions: true,
        allowUnboundThis: true,
      },
    ],
    //"@typescript-eslint/explicit-function-return-type": "warn"
  },
  overrides: [
    {
      files: ["*.test.*"],
      plugins: ["jest"],
      rules: {
        // you should turn the original rule off *only* for test files
        "@typescript-eslint/unbound-method": "off",
        "jest/unbound-method": "error",
      },
    },
  ],
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      typescript: {},
    },
  },
};
