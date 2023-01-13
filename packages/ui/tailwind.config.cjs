/** @type {import('tailwindcss').Config} */
const settings = require("@answeroverflow/tailwind-config");

module.exports = {
  ...settings,
  content: [
    ...settings.content,
    "./node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
    "../../node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
  ]
};
