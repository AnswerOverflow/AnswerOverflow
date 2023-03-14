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
          white: "#F5F8FF",
          black: "#141619",
          blue: "#396FF8",
          green: "#4BB543",
          yellow: "#DECB33",
          red: "#DE3D33"
        },
      },
      borderWidth: {
        1: "1px",
      },
      visibility: ["group-hover"],
      // Custom linear gradient
      backgroundImage: () => ({
        "gradient-to-br-dark-glass":
          "linear-gradient(145.98deg, rgba(31, 32, 34, 0.37) -3.49%, rgba(31, 32, 34, 0.37) -3.48%, rgba(31, 32, 34, 0.1591) 108.92%);",
        "gradient-to-br-light-glass":
          "linear-gradient(145.98deg, rgba(183, 190, 206, 0.37) -3.49%, rgba(183, 190, 206, 0.1591) 108.92%);",
      }),
      borderRadius: {
        standard: "5px",
      },
    },
  },

  darkMode: "class",
};
