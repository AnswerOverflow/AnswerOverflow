/** @type {import("eslint").Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
  extends: [
    "turbo",
    "prettier",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  plugins: ["prettier", "@typescript-eslint", "import"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
    sourceType: "module",
  },
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
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error"],
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        selector: "variable",
        format: ["snake_case", "UPPER_CASE"],
        leadingUnderscore: "allow",
        trailingUnderscore: "allow",
      },
      {
        selector: "typeLike",
        format: ["PascalCase"],
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
