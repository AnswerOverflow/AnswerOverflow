import { defineConfig } from 'tsup';

export default defineConfig({
	entry: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'src/**/*.tsx',
		'!src/**/*.test.ts*',
	],
	skipNodeModulesBundle: true,
	tsconfig: 'tsconfig.json',
	noExternal: [
		'@answeroverflow/elastic-types',
		'@answeroverflow/prisma-types',
		'@answeroverflow/db',
		'@answeroverflow/auth',
		'@answeroverflow/api',
		'@answeroverflow/analytics',
		'@answeroverflow/discordjs-utils',
		'@answeroverflow/utils',
		'@answeroverflow/constants',
		'@answeroverflow/cache',
		'@answeroverflow/discordjs-mock',
		'@answeroverflow/payments',
	],
});
