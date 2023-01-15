/** @type {import("tailwindcss").Config} */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const data = require("@answeroverflow/tailwind-config");
module.exports = {
  ...data,
  content: [
    ...data.content,
    "../../node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}", // Transpile breaks without this for tailwind styles
  ],
};
