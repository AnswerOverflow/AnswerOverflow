import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@packages/ui", "@packages/database"],
	images: {
		domains: [
			"cdn.discordapp.com",
			"avatars.githubusercontent.com",
			"media.discordapp.net",
			"utfs.io",
			"images-ext-2.discordapp.net",
			"answer-overflow-discord-attachments.s3.amazonaws.com",
		],
	},
};

export default nextConfig;
