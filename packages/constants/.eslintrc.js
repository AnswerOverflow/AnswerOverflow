/** @type {import("eslint").Linter.Config} */
module.exports = {
	root: true,
	extends: ['@answeroverflow/eslint-config-custom'],
	overrides: [
		{
			files: ['*.ts', '*.tsx'],
			rules: {
				'@typescript-eslint/naming-convention': ['off'],
			},
		},
	],
};
