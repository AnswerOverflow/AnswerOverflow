module.exports = {
  extends: [
    "next",
    "turbo",
    "prettier",
    "eslint:recommended",
    "plugin:jest/recommended",
  ],
  plugins: ["prettier", "jest"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "off",
    "prettier/prettier": ["error"],
    //"@typescript-eslint/explicit-function-return-type": "warn"
  },
  env: {
    jest: true,
  },
};
