import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { anonymous } from "better-auth/plugins";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import type { Plan } from "../schema";

export type { Plan };

const ALLOWED_TENANT_PATHS = [
	"/sign-in/anonymous",
	"/anonymous-session",
	"/get-session",
];

const getTrustedOrigins = (siteUrl: string): string[] => {
	const origins = [siteUrl];

	if (siteUrl.includes("localhost")) {
		if (!origins.includes("http://localhost:3000")) {
			origins.push("http://localhost:3000");
		}
	}

	const additionalOrigins = process.env.ADDITIONAL_TRUSTED_ORIGINS;
	if (additionalOrigins) {
		for (const origin of additionalOrigins.split(",")) {
			const trimmed = origin.trim();
			if (trimmed && !origins.includes(trimmed)) {
				origins.push(trimmed);
			}
		}
	}

	return origins;
};

export const authComponent = createClient<DataModel>(components.betterAuth);

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
		trustedOrigins: async (request: Request) => {
			const staticOrigins = getTrustedOrigins(siteUrl);
			const origin = request.headers.get("origin");
			if (!origin) return staticOrigins;
			return [...staticOrigins, origin];
		},
		advanced: {
			disableCSRFCheck: true,
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
		hooks: {
			before: createAuthMiddleware(async (authCtx) => {
				const origin = authCtx.headers?.get("origin");
				if (!origin) return;

				try {
					const url = new URL(origin);
					const domain = url.hostname;
					const mainSiteUrl = new URL(siteUrl);
					const mainSiteDomain = mainSiteUrl.hostname;

					if (domain === mainSiteDomain) {
						return;
					}

					const preferences = await ctx.runQuery(
						internal.private.server_preferences
							.getServerPreferencesByCustomDomain,
						{ customDomain: domain },
					);

					if (preferences) {
						const isAllowedPath = ALLOWED_TENANT_PATHS.some((p) =>
							authCtx.path.startsWith(p),
						);

						if (!isAllowedPath) {
							throw new APIError("FORBIDDEN", {
								message: "Only anonymous auth is available on tenant sites",
							});
						}
					} else {
						throw new APIError("FORBIDDEN", {
							message: "Invalid origin",
						});
					}
				} catch (e) {
					if (e instanceof APIError) throw e;
				}
			}),
		},
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
				scope: ["identify", "email", "guilds"],
			},
		},
		plugins: [
			convex(),
			anonymous({
				// https://github.com/better-auth/better-auth/pull/5825 anon users with convex is partly bugged
				disableDeleteAnonymousUser: true,
			}),
		],
	});
};
