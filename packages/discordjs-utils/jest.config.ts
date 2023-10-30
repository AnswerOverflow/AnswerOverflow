import type { JestConfigWithTsJest } from 'ts-jest';
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,@typescript-eslint/no-var-requires
require('dotenv').config();
const jestConfig: JestConfigWithTsJest = {
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
};

export default jestConfig;
