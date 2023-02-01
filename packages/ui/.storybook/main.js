const path = require('path'); // 👈 import path

module.exports = {
  "stories": ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  "addons": ["@storybook/addon-links", "@storybook/addon-essentials", "@storybook/addon-interactions", "@storybook/addon-a11y", {
    name: "@storybook/addon-postcss",
    options: {
      postcssLoaderOptions: {
        implementation: require("postcss")
      }
    }
  }],
  framework: {
    name: '@storybook/nextjs', // Add this
    options: {},
  },
  webpackFinal: async (config, {
    configType
  }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '~ui/test': path.resolve(__dirname, "../test/"),
      '~ui': path.resolve(__dirname, "../src/")
    };
    return config;
  },
  staticDirs: ['../../../apps/nextjs/public'],
  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: false,
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: prop => prop.parent ? !/node_modules/.test(prop.parent.fileName) : true
    }
  },
  docs: {
    autodocs: false
  },
  env: (config) => ({
    ...config,
    THEME: process.env.THEME ?? "both",
  }),
};
