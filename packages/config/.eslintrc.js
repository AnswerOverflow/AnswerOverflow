/** @type {import("eslint").Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
  extends: ["@answeroverflow/custom"],
  parserOptions: {
    project: ["./*/tsconfig.json"],
    sourceType: "module",
  },
};
