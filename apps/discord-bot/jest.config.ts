import type { JestConfigWithTsJest } from 'ts-jest';
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,@typescript-eslint/no-var-requires,n/no-extraneous-require
require('dotenv').config();
const jestConfig: JestConfigWithTsJest = {
	// [...]
	// Replace `ts-jest` with the preset you want to use
	// from the above list
	preset: 'ts-jest',
	resetMocks: true,
	testTimeout: 60000,
	detectOpenHandles: false,
	forceExit: true,
	testEnvironment: 'node',
	testMatch: ['**/*.test.ts(x)?'],
	transform: {
		'^.+\\.(t|j)sx?$': '@swc/jest',
	},
	setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};

export default jestConfig;
