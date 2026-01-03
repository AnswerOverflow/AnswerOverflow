import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin, anonymous, apiKey } from "better-auth/plugins";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import authSchema from "../betterAuth/schema";
import type { Plan } from "../schema";

// This is the REAL auth configuration used at runtime with secrets, OAuth
// providers, trusted origins, and tenant site hooks.
// There is also a stub config at packages/database/convex/betterAuth/auth.ts
// used only for schema type inference by the vendored component.
//
// Keep `user.additionalFields` and `plugins` in sync with the stub config.

export type { Plan };

const ALLOWED_TENANT_PATHS = [
	"/sign-in/anonymous",
	"/anonymous-session",
	"/get-session",
];

const TRUSTED_ORIGINS = [
	"https://www.answeroverflow.com",
	"http://localhost:3000",
	"https://ao.tail5665af.ts.net",
	"https://local.rhys.dev",
];

export const authComponent = createClient<DataModel, typeof authSchema>(
	components.betterAuth,
	{
		local: {
			schema: authSchema,
		},
	},
);

export const createAuthOptions = (
	ctx: GenericCtx<DataModel>,
	{ optionsOnly } = { optionsOnly: false },
): BetterAuthOptions => {
	return {
		logger: {
			disabled: optionsOnly,
		},
		trustedOrigins: TRUSTED_ORIGINS,
		advanced: {
			disableCSRFCheck: true,
		},
		account: {
			accountLinking: {
				enabled: true,
				allowDifferentEmails: true,
			},
		},
		baseURL: process.env.SITE_URL,
		database: authComponent.adapter(ctx),
		secret: (() => {
			const secret = process.env.BETTER_AUTH_SECRET;
			if (!secret) {
				throw new Error("BETTER_AUTH_SECRET environment variable is required");
			}
			return secret;
		})(),
		user: {
			additionalFields: {
				role: {
					type: "string",
					required: false,
				},
			},
		},
		hooks: {
			before: createAuthMiddleware(async (authCtx) => {
				const hookOrigin = authCtx.headers?.get("origin");
				if (!hookOrigin) return;

				try {
					const url = new URL(hookOrigin);
					const domain = url.hostname;
					const mainSiteUrl = new URL("https://www.answeroverflow.com");
					const mainSiteDomain = mainSiteUrl.hostname;

					if (domain === mainSiteDomain) {
						return;
					}

					if (domain === "localhost") {
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
			...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
				? {
						github: {
							clientId: process.env.GITHUB_CLIENT_ID,
							clientSecret: process.env.GITHUB_CLIENT_SECRET,
							scope: [],
						},
					}
				: {}),
		},
		plugins: [
			convex({ authConfig }),
			crossDomain({
				siteUrl: process.env.SITE_URL ?? "https://www.answeroverflow.com",
			}),
			anonymous({
				disableDeleteAnonymousUser: true,
			}),
			admin({
				impersonationSessionDuration: 60 * 60,
			}),
			apiKey({
				defaultPrefix: "user_",
				enableSessionForAPIKeys: true,
				enableMetadata: false,
				rateLimit: {
					enabled: false,
				},
			}),
		],
	} satisfies BetterAuthOptions;
};

export const createAuth = (
	ctx: GenericCtx<DataModel>,
	{ optionsOnly } = { optionsOnly: false },
): ReturnType<typeof betterAuth> => {
	return betterAuth(createAuthOptions(ctx, { optionsOnly }));
};
