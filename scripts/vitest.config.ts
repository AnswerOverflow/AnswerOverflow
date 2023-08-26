// Reference https://github.com/sapphiredev/utilities/blob/main/scripts/vitest.config.ts
import type { ESBuildOptions } from 'vite';
import { defineConfig, type UserConfig } from 'vitest/config';

const million = require("million/compiler"); // Import Million.js compiler

export const createVitestConfig = (options: UserConfig = {}) =>
	defineConfig({
		...options,
		test: {
			...options?.test,
			testTimeout: 60000,
			globals: true,
			coverage: {
				...options.test?.coverage,
				enabled: false,
				provider: 'c8',
				reporter: ['text', 'lcov', 'clover'],
				exclude: [
					...(options.test?.coverage?.exclude ?? []),
					'**/node_modules/**',
					'**/dist/**',
					'**/tests/**',
				],
			},
		},
		esbuild: {
			...options?.esbuild,
			target:
				(options?.esbuild as ESBuildOptions | undefined)?.target ?? 'es2020',
		},
	});

// Wrap the configuration with Million.js's block() function
module.exports = million.block(createVitestConfig());
