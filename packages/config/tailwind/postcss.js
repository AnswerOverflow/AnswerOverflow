// @filename postcss.config.js
module.exports = {
  plugins: {
    '@unocss/postcss': {
      content: ['**/*.{html,js,ts,jsx,tsx}'],
    }
  },
}
