import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import react from '@vitejs/plugin-react-swc';

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
		plugins: [tsconfigPaths(), react()],
		resolve: {
			alias: {
				'next/image': path.resolve(__dirname, './.ladle/UnoptimizedImage.tsx'),
				'next/link': path.resolve(__dirname, './.ladle/UnoptimizedLink.tsx'),
				'next/font/google': path.resolve(
					__dirname,
					'./.ladle/UnoptimizedFont.tsx',
				),
			},
		},
		optimizeDeps: {
			exclude: ['next/font', 'next/font/google'],
		},

		publicDir: '../../apps/main-site/public/',
	});
};

export default config;
