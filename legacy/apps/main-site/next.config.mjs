// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */

!process.env.SKIP_ENV_VALIDATION &&
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
		ppr: true,
		instrumentationHook: true,
	},
	images: {
		domains: [
			'cdn.discordapp.com',
			'avatars.githubusercontent.com',
			'media.discordapp.net',
			'utfs.io',
			'images-ext-2.discordapp.net',
			'answer-overflow-discord-attachments.s3.amazonaws.com',
		],
	},
	// We already do linting on GH actions
	eslint: {
		ignoreDuringBuilds: !!process.env.CI,
	},
	productionBrowserSourceMaps: true, // we're open source so why not
	rewrites: async () => {
		return [
			{
				source: '/sitemap-:path',
				destination:
					'https://answer-overflow-discord-attachments.s3.amazonaws.com/sitemaps/sitemap-:path',
			},
			{
				source: '/sitemap.xml',
				destination:
					'https://answer-overflow-discord-attachments.s3.amazonaws.com/sitemaps/sitemap.xml',
			},
			{
				source: '/sitemap:path',
				destination:
					'https://answer-overflow-discord-attachments.s3.amazonaws.com/sitemaps/sitemap-:path',
			},
			{
				source: '/ingest/static/:path*',
				destination: 'https://us-assets.i.posthog.com/static/:path*',
			},
			{
				source: '/ingest/:path*',
				destination: 'https://us.i.posthog.com/:path*',
			},
		];
	},
	skipTrailingSlashRedirect: true,
	redirects: async () => {
		return [
			{
				source: '/onboarding:slug*',
				destination:
					process.env.NODE_ENV === 'development'
						? 'http://localhost:3002/onboarding'
						: 'https://app.answeroverflow.com/onboarding',
				permanent: process.env.NODE_ENV === 'production',
			},
			{
				source: '/dashboard',
				destination:
					process.env.NODE_ENV === 'development'
						? 'http://localhost:3002/'
						: 'https://app.answeroverflow.com/',
				permanent: process.env.NODE_ENV === 'production',
			},
			{
				source: '/dashboard:slug*',
				destination:
					process.env.NODE_ENV === 'development'
						? 'http://localhost:3002/dashboard'
						: 'https://app.answeroverflow.com/dashboard',
				permanent: process.env.NODE_ENV === 'production',
			},
			{
				source: '/changelog',
				destination: 'https://docs.answeroverflow.com/changelog',
				permanent: false,
			},
			{
				source: '/changelog:slug*',
				destination: 'https://docs.answeroverflow.com/changelog:slug',
				permanent: false,
			},
		];
	},
};
import { withAxiom } from 'next-axiom';
// With content layer breaks things for us for some reason
const withAxiomConfig = withAxiom(config);

// @ts-ignore ignore
export default withMDX(withAxiomConfig);
