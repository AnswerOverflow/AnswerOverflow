import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		poolOptions: {
			threads: {
				singleThread: false,
			},
		},
		teardownTimeout: 10000,
	},
});
