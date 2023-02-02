/** @type {import('tailwindcss').Config} */

// eslint-disable-next-line no-undef
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./src/_app.tsx"],
  plugins: [
    // eslint-disable-next-line no-undef
    require("@tailwindcss/forms"),
    // eslint-disable-next-line no-undef
    require("tailwind-scrollbar-hide"),
    // eslint-disable-next-line no-undef
    require("tailwind-scrollbar"),
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-poppins)"],
        discord: ["Noto Sans", "sans-serif"],
        header: ["Montserrat", "sans-serif"],
        body: ["Source Sans Pro", "sans-serif"],
      },
      colors: {
        ao: {
          white: "#FAFCFF",
          black: "#070A0D",
        },
      },
      visibility: ["group-hover"],
    },
  },

  darkMode: "class",
};
