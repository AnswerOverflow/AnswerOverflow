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
      borderWidth: {
        1: "1px",
      },
      visibility: ["group-hover"],
      // Custom linear gradient
      backgroundImage: () => ({
        "gradient-to-br-dark-glass":
          "linear-gradient(145.98deg, rgba(57, 59, 63, 0.37) -3.49%, rgba(57, 59, 63, 0.1591) 108.92%);",
      }),
    },
  },

  darkMode: "class",
};
