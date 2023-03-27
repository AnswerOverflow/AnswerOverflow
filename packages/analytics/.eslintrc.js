/** @type {import("eslint").Linter.Config} */
module.exports = {
	root: true,
	extends: ['@answeroverflow/eslint-config-custom'],
	overrides: [
		{
			rules: {
				'@typescript-eslint/naming-convention': [
					'warn',
					{
						selector: 'typeProperty',
						format: ['PascalCase'],
					},
				],
			},
		},
	],
};
