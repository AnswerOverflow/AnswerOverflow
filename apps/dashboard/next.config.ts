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
	cacheComponents: true,
	reactCompiler: true,
};

export default nextConfig;
