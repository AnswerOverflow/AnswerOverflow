/** biome-ignore-all lint/style/noRestrictedImports: This is where we put the custom functions so need to consume them */
import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { action, query } from "../_generated/server";
import {
	getDiscordAccountIdFromAuth,
	getDiscordAccountWithToken,
} from "../shared/auth";
import { getAuthIdentity } from "../shared/authIdentity";
import { createDataAccessCache } from "../shared/dataAccess";
import { mutation } from "../triggers";

function validatePublicBackendAccessToken(token: string | undefined): boolean {
	const expectedToken = process.env.PUBLIC_BACKEND_ACCESS_TOKEN;
	if (!token || !expectedToken) {
		return false;
	}

	return token === expectedToken;
}

function validateBackendAccessToken(token: string | undefined): boolean {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;
	if (!token || !expectedToken) {
		return false;
	}
	return token === expectedToken;
}

export const publicQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.string()),
		anonymousSessionId: v.optional(v.string()),
		publicBackendAccessToken: v.optional(v.string()),
		backendAccessToken: v.optional(v.string()),
		type: v.optional(
			v.union(
				v.literal("signed-in"),
				v.literal("anonymous"),
				v.literal("admin"),
			),
		),
		rateLimitKey: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const isBackendRequest = validatePublicBackendAccessToken(
			args.publicBackendAccessToken,
		);

		const isLegacyBackendRequest = validateBackendAccessToken(
			args.backendAccessToken,
		);

		const cache = createDataAccessCache(ctx);

		if (isBackendRequest || isLegacyBackendRequest) {
			return {
				ctx: { ...ctx, cache },
				args: {
					...args,
					rateLimitKey: "backend",
					discordAccountId: undefined,
					anonymousSessionId: undefined,
					type: "admin" as const,
				},
			};
		}

		const identity = await getAuthIdentity(ctx);
		let anonymousSessionId: string | undefined;
		let discordAccountId: bigint | undefined;
		if (!identity) {
			throw new Error("No identity found");
		}
		if (identity.isAnonymous) {
			anonymousSessionId = identity.subject;
		} else {
			const account = await getDiscordAccountWithToken(ctx);
			discordAccountId = account?.accountId;
		}
		const identityType = identity.isAnonymous ? "anonymous" : "signed-in";

		const rateLimitKey = discordAccountId ?? anonymousSessionId;
		if (!rateLimitKey) {
			throw new Error("Not discord account or anonymous session found");
		}
		return {
			ctx: { ...ctx, cache },
			args: {
				...args,
				rateLimitKey,
				discordAccountId,
				anonymousSessionId,
				type: identityType,
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
		const cache = createDataAccessCache(ctx);
		let discordAccountId: bigint | undefined;
		let type: "signed-in" | "admin";

		if (validatePublicBackendAccessToken(args.backendAccessToken)) {
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
			ctx: { ...ctx, cache },
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

		if (validatePublicBackendAccessToken(args.backendAccessToken)) {
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
