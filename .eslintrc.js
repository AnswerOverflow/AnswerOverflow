module.exports = {
  root: true,
  // This tells ESLint to load the config from the package `eslint-config-custom`
  extends: ["@answeroverflow/custom"],
  parserOptions: {
    project: ["./packages/**/*/tsconfig.json", "./apps/**/*/tsconfig.json"],
    sourceType: "module",
  },
  settings: {
    next: {
      rootDir: ["apps/*/"],
    },
  },
};
