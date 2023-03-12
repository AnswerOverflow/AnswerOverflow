// eslint-disable-next-line no-restricted-imports
import { createVitestConfig } from "../../scripts/vitest.config";

export default createVitestConfig({
	envDir: "../../",
	test: {
		setupFiles: ["./test/setup.ts"]
	}
});
