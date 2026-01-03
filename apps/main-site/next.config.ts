import { withSentryConfig } from "@sentry/nextjs";
import createWithVercelToolbar from "@vercel/toolbar/plugins/next";
import { withBotId } from "botid/next/config";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withVercelToolbar = createWithVercelToolbar();

const withMDX = createMDX();

const nextConfig: NextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
	transpilePackages: ["@packages/ui", "@packages/database", "@packages/agent"],
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
			// {
			// 	source: "/api/auth/:path*",
			// 	destination: "https://www.answeroverflow.com/api/auth/:path*",
			// },
			{
				source: "/api/stickers/:stickerId.json",
				destination: "https://cdn.discordapp.com/stickers/:stickerId.json",
			},
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
				source: "/c/:serverId/sitemap.xml",
				destination:
					"https://answer-overflow-discord-attachments.s3.amazonaws.com/sitemaps/servers/:serverId.xml",
			},
			{
				source: `/api/${process.env.NEXT_PUBLIC_ANALYTICS_PATH ?? "a"}/static/:path*`,
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: `/api/${process.env.NEXT_PUBLIC_ANALYTICS_PATH ?? "a"}/:path*`,
				destination: "https://us.i.posthog.com/:path*",
			},
		];
	},
	assetPrefix:
		process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production"
			? undefined
			: "https://www.answeroverflow.com/",
	skipTrailingSlashRedirect: true,
	redirects: async () => {
		return [
			{
				source: "/changelog",
				destination: "/docs/changelog",
				permanent: false,
			},
			{
				source: "/changelog/:slug*",
				destination: "/docs/changelog/:slug",
				permanent: false,
			},
			{
				source: "/pricing",
				destination: "/about#pricing",
				permanent: false,
			},
			{
				source: "/onboarding",
				destination: "/dashboard",
				permanent: false,
			},
		];
	},
};

export default withSentryConfig(
	withVercelToolbar(withBotId(withMDX(nextConfig))),
	{
		org: process.env.SENTRY_ORG,
		project: process.env.SENTRY_PROJECT,
		silent: !process.env.CI,
		widenClientFileUpload: true,
		disableLogger: true,
		automaticVercelMonitors: true,
		sourcemaps: {
			deleteSourcemapsAfterUpload: false,
		},
		reactComponentAnnotation: {
			enabled: true,
		},
	},
);
