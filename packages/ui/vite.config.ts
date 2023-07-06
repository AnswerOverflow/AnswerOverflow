import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

const config = ({ mode }: { mode: string }) => {
	const env = loadEnv(mode, '../../../.env', '');
	return defineConfig({
		define: {
			'process.env': {
				...env,
				LADLE: true,
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

		publicDir: '../../apps/main-site/public/',
	});
};

export default config;
