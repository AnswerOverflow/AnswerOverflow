import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://astro.build/config
export default defineConfig({
	integrations: [tailwind(), react(), tsconfigPaths()],
	vite: {
		ssr: {
			noExternal: ['@answeroverflow/ui'],
		},
	},
});
