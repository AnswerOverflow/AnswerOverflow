import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { withBotId } from "botid/next/config";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

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
			{
				protocol: "https",
				hostname: "cdn.answeroverflow.com",
			},
		],
	},
	cacheComponents: false,
	reactCompiler: true,
	experimental: {
		turbopackFileSystemCacheForDev: true,
	},
	productionBrowserSourceMaps: true,
	webpack: (config) => {
		if (process.env.DEPLOY_TARGET === "cloudflare") {
			config.module.rules.push({
				test: /onig\.wasm$/,
				type: "asset/resource",
			});
		}

		return config;
	},
	rewrites: async () => {
		return [
			{
				source: "/docs",
				has: [
					{
						type: "header",
						key: "host",
						value: "www.answeroverflow.com",
					},
				],
				destination: "https://answeroverflow.mintlify.dev/docs",
			},
			{
				source: "/docs/:match*",
				has: [
					{
						type: "header",
						key: "host",
						value: "www.answeroverflow.com",
					},
				],
				destination: "https://answeroverflow.mintlify.dev/docs/:match*",
			},
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

export default withBotId(withMDX(nextConfig));

if (process.env.DEPLOY_TARGET === "cloudflare") {
	initOpenNextCloudflareForDev();
}
