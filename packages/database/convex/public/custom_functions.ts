/** biome-ignore-all lint/style/noRestrictedImports: This is where we put the custom functions so need to consume them */
import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { action, mutation, query } from "../_generated/server";
import { getDiscordAccountWithToken } from "../shared/auth";

async function getDiscordAccountIdForWrapper(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
	const account = await getDiscordAccountWithToken(ctx);
	return account?.accountId ?? null;
}

export const publicQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);

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

export const publicMutation = customMutation(mutation, {
	args: {
		discordAccountId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);

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
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);

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
