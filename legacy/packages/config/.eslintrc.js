/** @type {import("eslint").Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
  extends: ["@answeroverflow/eslint-config-custom"],
  parserOptions: {
    project: ["./*/tsconfig.json"],
  },
};
