// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */

import nextra from 'nextra';
import CopyPlugin from 'copy-webpack-plugin';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	swcMinify: true,
	transpilePackages: [
		'@answeroverflow/api',
		'@answeroverflow/auth',
		'@answeroverflow/db',
		'@answeroverflow/tailwind-config',
		'@answeroverflow/ui',
		'@answeroverflow/constants',
	],
	images: {
		domains: ['cdn.discordapp.com'],
	},
	experimental: {
		outputFileTracingIgnores: ['**swc/core**'],
	},
	// We already do linting on GH actions
	eslint: {
		ignoreDuringBuilds: !!process.env.CI,
	},
	webpack: (config, { webpack }) => {
		/**
		 * Copying the whole npm package of shiki to static/shiki because it
		 * loads some files from a "cdn" in the browser (semi-hacky)
		 * @see https://github.com/shikijs/shiki#specify-a-custom-root-directory
		 */
		config.plugins.push(
			new CopyPlugin({
				patterns: [
					{
						from: path.resolve(path.dirname(require.resolve('shiki')), '..'),
						to: 'static/shiki/',
					},
				],
			}),
		);
		return config;
	},
};
const withNextra = nextra({
	theme: 'nextra-theme-docs',
	themeConfig: './theme.config.tsx',
});

export default withNextra(config);
