module.exports = {
	root: true,
	// This tells ESLint to load the config from the package `eslint-config-custom`
	extends: ["@answeroverflow/eslint-config-custom/next"],
	settings: {
		tailwindcss: {
			whitelist: ["scrollbar-hide", "dark"]
		}
	}
};
