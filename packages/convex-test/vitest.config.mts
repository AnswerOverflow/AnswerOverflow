import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "edge-runtime",
		server: { deps: { inline: ["@packages/convex-test"] } },
		poolOptions: {
			threads: {
				singleThread: false,
			},
		},
		teardownTimeout: 10000,
	},
});
