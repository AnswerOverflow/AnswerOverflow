module.exports = {
  endOfLine: "lf",
  quoteProps: "as-needed",
  semi: true,
  singleQuote: true,
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
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindConfig: "../tailwind/index.js",
};
