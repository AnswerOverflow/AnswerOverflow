/** @type {import("eslint").Linter.Config} */

// Reference: https://dev.to/mryechkin/streamlining-your-tailwind-css-workflow-with-eslint-prettier-1hg
// eslint-disable-next-line no-undef
module.exports = {
  extends: ["next", "./index.js", "plugin:storybook/recommended", "plugin:tailwindcss/recommended"],
  env: {
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["tailwindcss"],
  rules: {
    "tailwindcss/no-custom-classname": [
      "warn", // TODO: Renable this eventually, whitelist is not working
      {
        config: "./tailwind.config.cjs",
        whitelist: ["scrollbar-hide", "dark"],
      },
    ],
    // Disable tailwindcss rearrange class
    "tailwindcss/classnames-order": "off",
  },
};
