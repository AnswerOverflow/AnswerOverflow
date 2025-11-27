/** biome-ignore-all lint/style/noRestrictedImports: This is where we put the custom functions so need to consume them */
import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server";
import {
	getDiscordAccountIdFromAuth,
	getDiscordAccountWithToken,
} from "../shared/auth";
import { getAuthIdentity } from "../shared/authIdentity";

function validateBackendAccessToken(token: string | undefined): boolean {
	if (!token) {
		return false;
	}

	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;
	const isDev =
		process.env.CONVEX_DEPLOYMENT === "dev" || !process.env.CONVEX_DEPLOYMENT;

	if (!expectedToken) {
		return false;
	}

	if (isDev && token === "TESTING") {
		return true;
	}

	return token === expectedToken;
}

export const publicQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.int64()),
		anonymousSessionId: v.optional(v.string()),
		type: v.optional(
			v.union(
				v.literal("signed-in"),
				v.literal("admin"),
				v.literal("anonymous"),
			),
		),
		rateLimitKey: v.optional(v.string()),
		backendAccessToken: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		if (validateBackendAccessToken(args.backendAccessToken)) {
			return {
				ctx,
				args: {
					discordAccountId: undefined,
					anonymousSessionId: undefined,
					type: "admin" as const,
					rateLimitKey: "admin",
					backendAccessToken: args.backendAccessToken,
				},
			};
		}

		const identity = await getAuthIdentity(ctx);

		if (!identity) {
			throw new Error("Not authenticated");
		}

		if (identity.isAnonymous) {
			const anonymousSessionId = identity.subject;
			if (!anonymousSessionId) {
				throw new Error("Anonymous session ID not found");
			}
			return {
				ctx,
				args: {
					discordAccountId: undefined,
					anonymousSessionId,
					type: "anonymous" as const,
					rateLimitKey: "testing",
					backendAccessToken: args.backendAccessToken,
				},
			};
		}

		const account = await getDiscordAccountWithToken(ctx);
		const discordAccountId = account?.accountId;
		if (!discordAccountId) {
			throw new Error("Signed in but no Discord account found");
		}
		return {
			ctx,
			args: {
				discordAccountId,
				anonymousSessionId: undefined,
				type: "signed-in" as const,
				rateLimitKey: "testing",
				backendAccessToken: args.backendAccessToken,
			},
		};
	},
});

export const publicMutation = customMutation(mutation, {
	args: {
		discordAccountId: v.optional(v.string()),
		backendAccessToken: v.optional(v.string()),
		type: v.optional(v.union(v.literal("signed-in"), v.literal("admin"))),
	},
	input: async (ctx, args) => {
		let discordAccountId: bigint | undefined;
		let type: "signed-in" | "admin";

		if (validateBackendAccessToken(args.backendAccessToken)) {
			discordAccountId = undefined;
			type = "admin";
		} else {
			const identity = await getAuthIdentity(ctx);

			if (!identity || identity.audience !== "convex") {
				throw new Error("Not authenticated or Discord account not linked");
			}

			discordAccountId = (await getDiscordAccountIdFromAuth(ctx)) ?? undefined;
			if (!discordAccountId) {
				throw new Error("Not authenticated or Discord account not linked");
			}
			type = "signed-in";
		}

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
				type,
			},
		};
	},
});

export const publicAction = customAction(action, {
	args: {
		discordAccountId: v.optional(v.string()),
		backendAccessToken: v.optional(v.string()),
		type: v.optional(v.union(v.literal("signed-in"), v.literal("admin"))),
	},
	input: async (ctx, args) => {
		let discordAccountId: bigint | undefined;
		let type: "signed-in" | "admin";

		if (validateBackendAccessToken(args.backendAccessToken)) {
			discordAccountId = undefined;
			type = "admin";
		} else {
			const identity = await getAuthIdentity(ctx);

			if (!identity || identity.audience !== "convex") {
				throw new Error("Not authenticated or Discord account not linked");
			}

			discordAccountId = (await getDiscordAccountIdFromAuth(ctx)) ?? undefined;
			if (!discordAccountId) {
				throw new Error("Not authenticated or Discord account not linked");
			}
			type = "signed-in";
		}

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
				type,
			},
		};
	},
});
