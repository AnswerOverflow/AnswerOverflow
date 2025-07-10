// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */

!process.env.SKIP_ENV_VALIDATION &&
	(await import('../../packages/env/src/web-schema.mjs'));
const nextJSMDX = await import('@next/mdx');

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
		'@answeroverflow/ui',
		'@answeroverflow/env',
	],
	experimental: {
		ppr: false,
		mdxRs: true,
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
	assetPrefix:
		process.env.NODE_ENV === 'development'
			? undefined
			: 'https://www.answeroverflow.com/',
	skipTrailingSlashRedirect: true,
	redirects: async () => {
		// We need to dynamically get the dashboard URL
		const getDashboardUrl = () => {
			const deploymentEnv = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
			const nodeEnv = process.env.NODE_ENV;
			
			// Local development
			if (deploymentEnv === 'local' || nodeEnv === 'development') {
				return 'http://localhost:3002';
			}
			
			// Production
			if (deploymentEnv === 'production') {
				return 'https://app.answeroverflow.com';
			}
			
			// For preview deployments, try to use VERCEL_URL
			if (process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL) {
				const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
				return `https://${vercelUrl}`;
			}
			
			// Fallback to production for other cases
			return 'https://app.answeroverflow.com';
		};

		const dashboardUrl = getDashboardUrl();

		return [
			{
				source: '/onboarding:slug*',
				destination: `${dashboardUrl}/onboarding`,
				permanent: process.env.NODE_ENV === 'production',
			},
			{
				source: '/dashboard',
				destination: dashboardUrl,
				permanent: process.env.NODE_ENV === 'production',
			},
			{
				source: '/dashboard:slug*',
				destination: `${dashboardUrl}/dashboard`,
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

// @ts-ignore - Temporary fix for type incompatibility between Next.js and MDX package versions
export default withMDX(config);
