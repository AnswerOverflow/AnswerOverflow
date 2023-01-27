/** @type {import('tailwindcss').Config} */

// eslint-disable-next-line no-undef
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./src/_app.tsx"],
  plugins: [
    // eslint-disable-next-line no-undef
    require("flowbite/plugin"),
    // eslint-disable-next-line no-undef
    require("@tailwindcss/forms"),
    // eslint-disable-next-line no-undef
    require("tailwind-scrollbar-hide"),
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-poppins)"],
      },
      visibility: ["group-hover"],
    },
  },

  darkMode: "class",
};
