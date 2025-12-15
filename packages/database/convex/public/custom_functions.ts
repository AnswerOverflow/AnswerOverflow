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

	if (!expectedToken) {
		return false;
	}

	return token === expectedToken;
}

export const publicQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.string()),
		anonymousSessionId: v.optional(v.string()),
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
		const isBackendRequest = validateBackendAccessToken(
			args.backendAccessToken,
		);

		if (isBackendRequest) {
			return {
				ctx,
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
			ctx,
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
