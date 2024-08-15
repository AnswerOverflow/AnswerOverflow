/** @type {import("prettier").Config} */
export default {
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  printWidth: 80,
  trailingComma: 'all',
  useTabs: true,
  plugins: ['prettier-plugin-astro'],
  overrides: [
    {
      files: '.all-contributorsrc',
      options: {
        parser: 'json',
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
        trailingComma: 'none',
      },
    },
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
};
