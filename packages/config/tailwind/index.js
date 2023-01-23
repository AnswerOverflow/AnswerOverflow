/** @type {import('tailwindcss').Config} */

// eslint-disable-next-line no-undef
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./src/_app.tsx"],
  // eslint-disable-next-line no-undef
  plugins: [require("flowbite/plugin"), require("@tailwindcss/forms")],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-poppins)"],
      },
    },
  },
  darkMode: "class",
};
