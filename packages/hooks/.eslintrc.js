/** @type {import("eslint").Linter.Config} */
module.exports = {
	root: true,
	// This tells ESLint to load the config from the package `eslint-config-custom`
	extends: ['@answeroverflow/eslint-config-custom/next'],
	overrides: [
		{
			files: ['*.ts', '*.tsx'],
			rules: {
				'@typescript-eslint/naming-convention': [
					'warn',
					{
						selector: 'typeProperty',
						format: ['PascalCase, camelCase'],
					},
				],
			},
		},
	],
};
