import { withBotId } from "botid/next/config";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
	pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
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
		// turbopackFileSystemCacheForBuild: true,
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
	// TODO: probably bring this back
	// assetPrefix:
	// 	process.env.NODE_ENV === "development"
	// 		? undefined
	// 		: "https://www.answeroverflow.com/",
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

export default withBotId(withMDX(nextConfig));
