/** @type {import("eslint").Linter.Config} */

// Reference: https://dev.to/mryechkin/streamlining-your-tailwind-css-workflow-with-eslint-prettier-1hg
// eslint-disable-next-line no-undef
module.exports = {
	extends: ['./index.js', 'plugin:tailwindcss/recommended', 'next', 'prettier'],
	env: {
		browser: true,
		es2021: true,
	},
	rules: {
		'tailwindcss/no-custom-classname': [
			'error', // TODO: Reenable this eventually, whitelist is not working
			{
				config: './tailwind.config.cjs',
				whitelist: ['scrollbar-hide', 'dark'],
			},
		],
		'tailwindcss/enforces-shorthand': 'off',
		'tailwindcss/no-unnecessary-arbitrary-value': 'off',
		// Disable tailwindcss rearrange class
		'tailwindcss/classnames-order': 'off',
	},
};
