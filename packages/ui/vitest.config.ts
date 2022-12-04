// Reference: https://stackblitz.com/edit/vitest-dev-vitest-t3cufc?file=tsconfig.json,vite.config.ts,package.json
// eslint-disable-next-line no-restricted-imports
import { createVitestConfig } from "../../scripts/vitest.config";
import react from "@vitejs/plugin-react";
export default createVitestConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
  },
});
