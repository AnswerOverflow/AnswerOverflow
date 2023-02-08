// eslint-disable-next-line no-restricted-imports
import { createVitestConfig } from "../../scripts/vitest.config";
import path from "path";

export default createVitestConfig({
  resolve: {
    alias: {
      "~api/router": path.resolve(_Dirname, "./src/router/"),
      "~api/test": path.resolve(_Dirname, "./test/"),
      "~api/utils": path.resolve(_Dirname, "./src/utils/"),
    },
  },
});
