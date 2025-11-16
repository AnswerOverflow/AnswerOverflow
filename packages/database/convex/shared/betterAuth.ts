import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";

const siteUrl = process.env.SITE_URL!;

const getTrustedOrigins = (): string[] => {
	const origins = [siteUrl];

	if (siteUrl.includes("localhost")) {
		if (!origins.includes("http://localhost:3000")) {
			origins.push("http://localhost:3000");
		}
	}

	return origins;
};

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
	ctx: GenericCtx<DataModel>,
	{ optionsOnly } = { optionsOnly: false },
): ReturnType<typeof betterAuth> => {
	return betterAuth({
		logger: {
			disabled: optionsOnly,
		},
		baseURL: siteUrl,
		database: authComponent.adapter(ctx),
		secret: process.env.BETTER_AUTH_SECRET!,
		trustedOrigins: getTrustedOrigins(),
		socialProviders: {
			discord: {
				clientId: process.env.DISCORD_CLIENT_ID!,
				clientSecret: process.env.DISCORD_CLIENT_SECRET!,
			},
		},
		plugins: [convex()],
	});
};
