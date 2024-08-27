/** @type {import("eslint").Linter.Config} */

// Reference: https://dev.to/mryechkin/streamlining-your-tailwind-css-workflow-with-eslint-prettier-1hg
// eslint-disable-next-line no-undef
module.exports = {
  extends: ['./index.js', '@unocss', 'next', 'prettier'],
  env: {
    browser: true,
    es2021: true,
  },
};
