import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { action, query } from "../_generated/server";
import { getDiscordAccountWithToken } from "../shared/auth";
import { authComponent } from "../shared/betterAuth";
import { mutation } from "../triggers";

async function getDiscordAccountIdForWrapper(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<bigint | null> {
	const account = await getDiscordAccountWithToken(ctx);
	return account?.accountId ?? null;
}

async function verifyAdmin(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<{ discordAccountId: bigint; adminUserId: string }> {
	const user = await authComponent.safeGetAuthUser(ctx);
	if (!user) {
		throw new Error("Not authenticated");
	}
	if (user.role !== "admin") {
		throw new Error("Unauthorized: Admin access required");
	}

	const discordAccountId = await getDiscordAccountIdForWrapper(ctx);
	if (!discordAccountId) {
		throw new Error("Not authenticated or Discord account not linked");
	}

	return { discordAccountId, adminUserId: user._id };
}

export const adminQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.int64()),
		adminUserId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const { discordAccountId, adminUserId } = await verifyAdmin(ctx);

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
				adminUserId,
			},
		};
	},
});

export const adminMutation = customMutation(mutation, {
	args: {
		discordAccountId: v.optional(v.int64()),
		adminUserId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const { discordAccountId, adminUserId } = await verifyAdmin(ctx);

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
				adminUserId,
			},
		};
	},
});

export const adminAction = customAction(action, {
	args: {
		discordAccountId: v.optional(v.int64()),
		adminUserId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const { discordAccountId, adminUserId } = await verifyAdmin(ctx);

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
				adminUserId,
			},
		};
	},
});
