// eslint-disable-next-line no-restricted-imports
import { createVitestConfig } from "../../scripts/vitest.config";
import path from "path";

export default createVitestConfig({
  resolve: {
    alias: {
      "@router": path.resolve(__dirname, "./src/router/"),
      "@testing": path.resolve(__dirname, "./src/test/"),
      "~utils": path.resolve(__dirname, "./src/utils/"),
      "~primitives": path.resolve(__dirname, "./src/primitives"),
      "~interaction-handlers": path.resolve(__dirname, "./src/interaction-handlers"),
      "~components": path.resolve(__dirname, "./src/components"),
      "~test": path.resolve(__dirname, "./test/"),
      "~listeners": path.resolve(__dirname, "./src/listeners"),
    },
  },
});
