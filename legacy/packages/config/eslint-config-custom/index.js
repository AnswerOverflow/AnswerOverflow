/** @type {import("eslint").Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'prettier',
		'plugin:n/recommended',
	],
	plugins: ['@typescript-eslint', 'no-only-tests'],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2021,
		ecmaFeatures: {
			jsx: true,
		},
		project: ['./tsconfig.json'],
		sourceType: 'module',
	},
	ignorePatterns: [
		'.eslintrc.js',
		'dist/',
		'node_modules/',
		'storybook-static*/',
		'.next/',
		'out/',
		'build',
		'coverage/',
	],
	rules: {
		// todo: reenable the n/ stuff
		'n/no-missing-import': 'off',
		'n/no-missing-require': 'off',
		'n/no-unpublished-import': 'off',
		'n/no-unsupported-features/node-builtins': 'off',
		'n/no-process-env': 'error',
		'@next/next/no-html-link-for-pages': 'off',
		'react/jsx-key': 'off',
		'@typescript-eslint/no-floating-promises': 'error',
		'@typescript-eslint/prefer-as-const': 'error',
		'no-restricted-imports': 'off',
		'no-await-in-loop': 'error',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/no-redundant-type-constituents': 'off',
		'no-only-tests/no-only-tests': [
			// eslint-disable-next-line no-undef
			process.env.CI ? 'error' : 'warn', // CI should never allow .only,
		],
		'prefer-arrow-callback': [
			'error',
			{
				allowNamedFunctions: true,
				allowUnboundThis: true,
			},
		],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': ['error'],
		'@typescript-eslint/naming-convention': [
			'warn',
			{
				selector: 'variable',
				format: ['camelCase', 'UPPER_CASE'],
				leadingUnderscore: 'allow',
				trailingUnderscore: 'allow',
			},
			{
				selector: 'variable',
				types: ['function'],
				// arrow functions & react components
				format: ['camelCase', 'PascalCase'],
			},
			{
				selector: 'typeLike',
				format: ['PascalCase'],
			},
			{
				selector: 'typeProperty',
				format: ['camelCase'],
			},
			{
				selector: 'typeProperty',
				types: ['function'],
				format: ['camelCase', 'PascalCase'],
			},
		],
		//"@typescript-eslint/explicit-function-return-type": "warn"
	},
	overrides: [
		{
			files: ['*.test.*'],
			plugins: ['jest'],
			rules: {
				// you should turn the original rule off *only* for test files
				'@typescript-eslint/unbound-method': 'off',
				'jest/unbound-method': 'error',
			},
		},
	],
	settings: {
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts', '.tsx'],
		},
		'import/resolver': {
			typescript: {},
		},
	},
};
