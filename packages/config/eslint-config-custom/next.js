/** @type {import("eslint").Linter.Config} */

// Reference: https://dev.to/mryechkin/streamlining-your-tailwind-css-workflow-with-eslint-prettier-1hg
// eslint-disable-next-line no-undef
module.exports = {
	extends: ['./index.js', 'plugin:tailwindcss/recommended', 'next', 'prettier'],
	plugins: ['@typescript-eslint'],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2021,
		ecmaFeatures: {
			jsx: true,
		},
		project: ['./tsconfig.json'],
		sourceType: 'module',
	},
	env: {
		browser: true,
		es2021: true,
	},
	rules: {
		'tailwindcss/no-custom-classname': [
			'error', // TODO: Renable this eventually, whitelist is not working
			{
				config: './tailwind.config.cjs',
				whitelist: ['scrollbar-hide', 'dark'],
			},
		],
		// Disable tailwindcss rearrange class
		'tailwindcss/classnames-order': 'off',
	},
	settings: {
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts', '.tsx'],
		},
		'import/resolver': {
			typescript: {},
		},
	},
};
