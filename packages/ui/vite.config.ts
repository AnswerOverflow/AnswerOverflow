import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default ({ mode }) => {
	const env = loadEnv(mode, '../../../.env', '');
	return defineConfig({
		define: {
			'process.env': {
        ...env,
        LADLE: true
      },
		},
		server: {
			open: false,
		},
		plugins: [tsconfigPaths()],
		resolve: {
			alias: {
				'next/image': path.resolve(__dirname, './.ladle/UnoptimizedImage.tsx'),
				'next/link': path.resolve(__dirname, './.ladle/UnoptimizedLink.tsx'),
			},
		},
	});
};
