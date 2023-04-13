// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */

import nextra from 'nextra';

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
};
const withNextra = nextra({
	theme: 'nextra-theme-docs',
	themeConfig: './theme.config.tsx',
});

export default withNextra(config);
