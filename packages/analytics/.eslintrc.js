/** @type {import("eslint").Linter.Config} */
module.exports = {
	root: true,
	extends: ['@answeroverflow/eslint-config-custom'],
	overrides: [
		{
      rules: {
      files: ['*.ts'], // Add the "files" property with the file patterns you want to target
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
