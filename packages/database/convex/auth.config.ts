import type { AuthConfig } from "convex/server";

const authConfig = {
	providers: [
		{
			domain: process.env.CONVEX_SITE_URL ?? "",
			applicationID: "convex",
		},
	],
} satisfies AuthConfig;

export default authConfig;
