import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths'


export default defineConfig({
  server: {
    open: false,
  },
  plugins: [tsconfigPaths()]
});

