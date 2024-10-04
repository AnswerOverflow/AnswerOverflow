// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */

!process.env.SKIP_ENV_VALIDATION &&
	(await import('../../packages/env/src/web-schema.mjs'));
const nextJSMDX = await import('@next/mdx');
// import remarkGfm from 'remark-gfm';

const withMDX = nextJSMDX.default({
	extension: /\.mdx?$/,
	options: {},
});

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
	transpilePackages: [
		'@answeroverflow/api',
		'@answeroverflow/core',
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
// @ts-expect-error
const withAxiomConfig = withAxiom(config);

// @ts-ignore ignore
export default withMDX(withAxiomConfig);
