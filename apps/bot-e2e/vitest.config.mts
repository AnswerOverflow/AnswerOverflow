import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		testTimeout: 60000,
		hookTimeout: 30000,
		teardownTimeout: 10000,
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		sequence: {
			shuffle: false,
		},
		fileParallelism: false,
	},
});
