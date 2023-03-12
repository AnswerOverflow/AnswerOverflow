/** @type {import("prettier").Config} */
// eslint-disable-next-line no-undef
module.exports = {
  endOfLine: "lf",
  quoteProps: "as-needed",
  semi: true,
  singleQuote: false,
  tabWidth: 4,
  printWidth: 100,
  trailingComma: "none",
  useTabs: true,
  overrides: [
    {
      files: ".all-contributorsrc",
      options: {
        parser: "json",
      },
    },
    {
      files: "*.yml",
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },
  ],
};
