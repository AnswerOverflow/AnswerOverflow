import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@packages/ui", "@packages/database"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn.discordapp.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "media.discordapp.net",
			},
			{
				protocol: "https",
				hostname: "utfs.io",
			},
			{
				protocol: "https",
				hostname: "answer-overflow-discord-attachments.s3.amazonaws.com",
			},
		],
	},
	cacheComponents: false,
	reactCompiler: true,
	experimental: {
		turbopackFileSystemCacheForDev: true,
	},
	productionBrowserSourceMaps: true,
	rewrites: async () => {
		return [
			{
				source: "/sitemap-:path",
				destination:
					"https://answer-overflow-discord-attachments.s3.amazonaws.com/sitemaps/sitemap-:path",
			},
			{
				source: "/sitemap.xml",
				destination:
					"https://answer-overflow-discord-attachments.s3.amazonaws.com/sitemaps/sitemap.xml",
			},
			{
				source: "/sitemap:path",
				destination:
					"https://answer-overflow-discord-attachments.s3.amazonaws.com/sitemaps/sitemap-:path",
			},
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
		];
	},
	assetPrefix:
		process.env.NODE_ENV === "development"
			? undefined
			: "https://www.answeroverflow.com/",
	skipTrailingSlashRedirect: true,
	redirects: async () => {
		return [
			{
				source: "/changelog",
				destination: "https://docs.answeroverflow.com/changelog",
				permanent: false,
			},
			{
				source: "/changelog/:slug*",
				destination: "https://docs.answeroverflow.com/changelog/:slug",
				permanent: false,
			},
		];
	},
};

export default withBotId(nextConfig);
