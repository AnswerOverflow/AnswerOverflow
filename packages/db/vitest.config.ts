// eslint-disable-next-line no-restricted-imports
import { createVitestConfig } from "../../scripts/vitest.config";
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
require("dotenv").config();

export default createVitestConfig({
  envDir: "../../",
  test: {
    globalSetup: "./test/setup.ts",
  },
});
