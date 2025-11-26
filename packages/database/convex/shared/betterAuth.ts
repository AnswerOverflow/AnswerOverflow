import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import type { Plan } from "../schema";

export type { Plan };

const getTrustedOrigins = (siteUrl: string): string[] => {
	const origins = [siteUrl];

	if (siteUrl.includes("localhost")) {
		if (!origins.includes("http://localhost:3000")) {
			origins.push("http://localhost:3000");
		}
	}

	return origins;
};

export const authComponent = createClient<DataModel>(components.betterAuth);

export const PLAN_LIMITS: Record<
	Plan,
	{
		customDomain: boolean;
		subpath: boolean;
		adFree: boolean;
		prioritySupport: boolean;
	}
> = {
	FREE: {
		customDomain: false,
		subpath: false,
		adFree: false,
		prioritySupport: false,
	},
	STARTER: {
		customDomain: true,
		subpath: false,
		adFree: true,
		prioritySupport: false,
	},
	ADVANCED: {
		customDomain: true,
		subpath: true,
		adFree: true,
		prioritySupport: true,
	},
	PRO: {
		customDomain: true,
		subpath: false,
		adFree: true,
		prioritySupport: false,
	},
	ENTERPRISE: {
		customDomain: true,
		subpath: true,
		adFree: true,
		prioritySupport: true,
	},
	OPEN_SOURCE: {
		customDomain: true,
		subpath: true,
		adFree: true,
		prioritySupport: true,
	},
};

export const createAuth = (
	ctx: GenericCtx<DataModel>,
	{ optionsOnly } = { optionsOnly: false },
): ReturnType<typeof betterAuth> => {
	const siteUrl = process.env.SITE_URL;
	if (!siteUrl) {
		throw new Error("SITE_URL environment variable is required");
	}

	return betterAuth({
		logger: {
			disabled: optionsOnly,
		},
		baseURL: siteUrl,
		database: authComponent.adapter(ctx),
		secret: (() => {
			const secret = process.env.BETTER_AUTH_SECRET;
			if (!secret) {
				throw new Error("BETTER_AUTH_SECRET environment variable is required");
			}
			return secret;
		})(),
		trustedOrigins: getTrustedOrigins(siteUrl),
		socialProviders: {
			discord: {
				clientId: (() => {
					const clientId = process.env.DISCORD_CLIENT_ID;
					if (!clientId) {
						throw new Error(
							"DISCORD_CLIENT_ID environment variable is required",
						);
					}
					return clientId;
				})(),
				clientSecret: (() => {
					const clientSecret = process.env.DISCORD_CLIENT_SECRET;
					if (!clientSecret) {
						throw new Error(
							"DISCORD_CLIENT_SECRET environment variable is required",
						);
					}
					return clientSecret;
				})(),
			},
		},
		plugins: [convex()],
	});
};
