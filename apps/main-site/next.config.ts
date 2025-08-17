import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@packages/ui", "@packages/database"],
};

export default nextConfig;
