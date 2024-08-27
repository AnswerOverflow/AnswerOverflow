import prettierConfig from "@answeroverflow/prettier-config"

/** @type {import("prettier").Config} */
export default {
  ...prettierConfig,
  plugins: ['prettier-plugin-tailwindcss'],
};
