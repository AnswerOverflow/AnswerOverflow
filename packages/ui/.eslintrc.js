/** @type {import("eslint").Linter.Config} */
module.exports = {
	root: true,
	// This tells ESLint to load the config from the package `eslint-config-custom`
	extends: ['@answeroverflow/eslint-config-custom/next'],
	overrides: [
		{
			files: ['*.stories.tsx'],
			rules: {
				'@typescript-eslint/naming-convention': [
					'warn',
					{
						selector: 'variable',
						format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
						leadingUnderscore: 'allow',
						trailingUnderscore: 'allow',
					},
				],
			},
		},
	],
};
