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

export const publicQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.string()),
		anonymousSessionId: v.optional(v.string()),
		type: v.optional(v.union(v.literal("signed-in"), v.literal("anonymous"))),
		rateLimitKey: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const identity = await getAuthIdentity(ctx);
		let anonymousSessionId: string | undefined;
		if (!identity) {
			throw new Error("Not authenticated");
		}
		const identityType = identity.type;
		const subject = identity.subject;
		if (identityType === "anonymous" && subject) {
			const anonymousSession = await ctx.db
				.query("anonymousSessions")
				.withIndex("by_sessionId", (q) => q.eq("sessionId", subject))
				.first();

			if (!anonymousSession) {
				throw new Error("Not authenticated");
			}
			anonymousSessionId = anonymousSession._id;
		}

		let discordAccountId: string | undefined;
		if (identityType !== "anonymous") {
			const account = await getDiscordAccountWithToken(ctx);
			discordAccountId = account?.accountId;
		}
		const rateLimitKey = discordAccountId ?? anonymousSessionId;
		if (!rateLimitKey) {
			throw new Error("Not authenticated");
		}
		return {
			ctx,
			args: {
				...args,
				rateLimitKey: "testing",
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
	},
	input: async (ctx, args) => {
		const identity = await getAuthIdentity(ctx);

		if (!identity || identity.audience !== "convex") {
			throw new Error("Not authenticated or Discord account not linked");
		}

		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});

export const publicAction = customAction(action, {
	args: {
		discordAccountId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const identity = await getAuthIdentity(ctx);

		if (!identity || identity.audience !== "convex") {
			throw new Error("Not authenticated or Discord account not linked");
		}

		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});
