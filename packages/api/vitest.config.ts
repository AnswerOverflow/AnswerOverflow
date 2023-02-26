// eslint-disable-next-line no-restricted-imports
import { createVitestConfig } from "../../scripts/vitest.config";
import path from "path";

export default createVitestConfig({
  resolve: {
    alias: {
      "~api/router": path.resolve(__dirname, "./src/router/"),
      "~api/test": path.resolve(__dirname, "./test/"),
      "~api/utils": path.resolve(__dirname, "./src/utils/"),
    },
  },
  envDir: "../../",
  test: {
    globalSetup: "./test/setup.ts",
  },
});
