/* eslint-disable @typescript-eslint/require-await */
import '@answeroverflow/env/web';
import { NextConfig } from 'next';
import nextMDX from '@next/mdx';

const withMDX = nextMDX({
	extension: /\.mdx?$/,
	options: {},
});

const config: NextConfig = {
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
		// eslint-disable-next-line n/no-process-env
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
					webServerEnv.NODE_ENV === 'development'
						? 'http://localhost:3002/onboarding'
						: 'https://app.answeroverflow.com/onboarding',
				permanent: webServerEnv.NODE_ENV === 'production',
			},
			{
				source: '/dashboard',
				destination:
					webServerEnv.NODE_ENV === 'development'
						? 'http://localhost:3002/'
						: 'https://app.answeroverflow.com/',
				permanent: webServerEnv.NODE_ENV === 'production',
			},
			{
				source: '/dashboard:slug*',
				destination:
					webServerEnv.NODE_ENV === 'development'
						? 'http://localhost:3002/dashboard'
						: 'https://app.answeroverflow.com/dashboard',
				permanent: webServerEnv.NODE_ENV === 'production',
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
import { webServerEnv } from '@answeroverflow/env/web';
// With content layer breaks things for us for some reason
const withAxiomConfig = withAxiom(config);

// @ts-ignore ignore
export default withMDX(withAxiomConfig);
