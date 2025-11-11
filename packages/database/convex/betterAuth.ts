import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth, type BetterAuthOptions } from "better-auth";

const siteUrl = process.env.SITE_URL!;

// Build trusted origins list - include site URL and optional dev URLs
const getTrustedOrigins = (): string[] => {
	const origins = [siteUrl];
	
	// Add development URLs if provided
	if (process.env.DASHBOARD_URL) {
		origins.push(process.env.DASHBOARD_URL);
	}
	if (process.env.MAIN_SITE_URL) {
		origins.push(process.env.MAIN_SITE_URL);
	}
	
	return origins;
};

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
	ctx: GenericCtx<DataModel>,
	{ optionsOnly } = { optionsOnly: false },
): ReturnType<typeof betterAuth> => {
	return betterAuth({
		// disable logging when createAuth is called just to generate options.
		// this is not required, but there's a lot of noise in logs without it.
		logger: {
			disabled: optionsOnly,
		},
		baseURL: siteUrl,
		database: authComponent.adapter(ctx),
		secret: process.env.BETTER_AUTH_SECRET!,
		trustedOrigins: getTrustedOrigins(),
		// Configure Discord OAuth provider
		socialProviders: {
			discord: {
				clientId: process.env.DISCORD_CLIENT_ID!,
				clientSecret: process.env.DISCORD_CLIENT_SECRET!,
			},
		},
		plugins: [
			// The Convex plugin is required for Convex compatibility
			convex(),
		],
	});
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return authComponent.getAuthUser(ctx);
	},
});

