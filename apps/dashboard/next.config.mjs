// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */

!process.env.SKIP_ENV_VALIDATION &&
	// @ts-expect-error
	(await import('@answeroverflow/env/web-schema.mjs'));

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
	transpilePackages: [
		'@answeroverflow/api',
		'@answeroverflow/auth',
		'@answeroverflow/db',
		'@answeroverflow/tailwind-config',
		'@answeroverflow/ui',
		'@answeroverflow/env',
	],
	experimental: {
		outputFileTracingIgnores: ['**swc/core**'],
		serverComponentsExternalPackages: ['mysql2'],
	},
	images: {
		domains: [
			'cdn.discordapp.com',
			'avatars.githubusercontent.com',
			'media.discordapp.net',
			'utfs.io',
		],
	},
	// https://github.com/kkomelin/isomorphic-dompurify/issues/54
	webpack: (config) => {
		config.externals = [...config.externals, 'canvas', 'jsdom'];
		return config;
	},
	// We already do linting on GH actions
	eslint: {
		ignoreDuringBuilds: !!process.env.CI,
	},
	productionBrowserSourceMaps: true, // we're open source so why not

	redirects: async () => {
		return [
			{
				source: '/',
				destination: '/onboarding',
				permanent: false,
			},
		];
	},
};

import { withAxiom } from 'next-axiom';

export default withAxiom(config);
