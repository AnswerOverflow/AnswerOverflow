import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { api } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { action, mutation, query } from "../_generated/server";
import { getDiscordAccountWithToken } from "../shared/auth";
import { DISCORD_PERMISSIONS, hasPermission } from "../shared/shared";

async function getDiscordAccountIdForWrapper(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<bigint | null> {
	const account = await getDiscordAccountWithToken(ctx);
	return account?.accountId ?? null;
}

export const authenticatedQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.int64()),
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

export const authenticatedMutation = customMutation(mutation, {
	args: {
		discordAccountId: v.optional(v.int64()),
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

export const authenticatedAction = customAction(action, {
	args: {
		discordAccountId: v.optional(v.int64()),
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

function getBackendAccessToken(): string {
	const token = process.env.BACKEND_ACCESS_TOKEN;
	return token ?? "";
}

export const manageGuildAction = customAction(action, {
	args: {
		discordAccountId: v.optional(v.int64()),
		serverId: v.int64(),
	},
	input: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);

		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}

		const backendAccessToken = getBackendAccessToken();

		const settings = await ctx.runQuery(
			api.private.user_server_settings.findUserServerSettingsById,
			{
				backendAccessToken,
				userId: discordAccountId,
				serverId: args.serverId,
			},
		);

		if (!settings) {
			throw new Error("You are not a member of this server");
		}

		const hasAdminOrManageGuild =
			hasPermission(settings.permissions, DISCORD_PERMISSIONS.Administrator) ||
			hasPermission(settings.permissions, DISCORD_PERMISSIONS.ManageGuild);

		if (!hasAdminOrManageGuild) {
			throw new Error(
				"You need Manage Guild or Administrator permission to perform this action",
			);
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
