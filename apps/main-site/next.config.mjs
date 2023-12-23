// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */

!process.env.SKIP_ENV_VALIDATION &&
	// @ts-expect-error
	(await import('@answeroverflow/env/web-schema.mjs'));
const nextJSMDX = await import('@next/mdx');
// import remarkGfm from 'remark-gfm';

const withMDX = nextJSMDX.default({
	extension: /\.mdx?$/,
	options: {},
	// options: {
	// 	// If you use remark-gfm, you'll need to use next.config.mjs
	// 	// as the package is ESM only
	// 	// https://github.com/remarkjs/remark-gfm#install
	// 	remarkPlugins: [remarkGfm],
	// 	rehypePlugins: [],
	// 	// If you use `MDXProvider`, uncomment the following line.
	// 	providerImportSource: '@mdx-js/react',
	// },
});

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	swcMinify: true,
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
		instrumentationHook: true,
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
	webpack: (config, { webpack }) => {
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
				source: '/onboarding:slug*',
				destination:
					process.env.NODE_ENV === 'development'
						? 'http://localhost:5000/onboarding'
						: 'https://app.answeroverflow.com/onboarding',
				permanent: process.env.NODE_ENV === 'production',
			},
			{
				source: '/dashboard:slug*',
				destination:
					process.env.NODE_ENV === 'development'
						? 'http://localhost:5000/dashboard'
						: 'https://app.answeroverflow.com/dashboard',
				permanent: process.env.NODE_ENV === 'production',
			},
		];
	},
};

import { withAxiom } from 'next-axiom';

// With content layer breaks things for us for some reason
export default withMDX(withAxiom(config));
