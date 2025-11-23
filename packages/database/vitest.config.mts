import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "edge-runtime",
		server: {
			deps: {
				inline: ["@packages/convex-test", "@packages/test-utils"],
			},
		},
		poolOptions: {
			threads: {
				singleThread: false,
			},
		},
		teardownTimeout: 10000,
	},
});
