import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { api } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { action, query } from "../_generated/server";
import { getDiscordAccountWithToken } from "../shared/auth";
import { authComponent } from "../shared/betterAuth";
import { createDataAccessCache } from "../shared/dataAccess";
import { DISCORD_PERMISSIONS, hasPermission } from "../shared/shared";
import { mutation } from "../triggers";

function validateBackendAccessToken(token: string | undefined): void {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;

	if (!expectedToken) {
		throw new Error("BACKEND_ACCESS_TOKEN is not configured");
	}

	if (token !== expectedToken) {
		throw new Error("Invalid BACKEND_ACCESS_TOKEN");
	}
}

async function getAuthUserId(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string> {
	const user = await authComponent.getAuthUser(ctx);
	if (!user) {
		throw new Error("Not authenticated");
	}
	return user._id;
}

async function getDiscordAccountIdForWrapper(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<bigint | null> {
	const account = await getDiscordAccountWithToken(ctx);
	return account?.accountId ?? null;
}

async function resolveDiscordAccountId(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	args: { backendAccessToken?: string; discordAccountId?: bigint },
): Promise<bigint> {
	if (args.backendAccessToken && args.discordAccountId) {
		validateBackendAccessToken(args.backendAccessToken);
		return args.discordAccountId;
	}

	const discordAccountId = await getDiscordAccountIdForWrapper(ctx);

	if (!discordAccountId) {
		throw new Error("Not authenticated or Discord account not linked");
	}

	return discordAccountId;
}

export const authenticatedQuery = customQuery(query, {
	args: {
		backendAccessToken: v.optional(v.string()),
		discordAccountId: v.optional(v.int64()),
	},
	input: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		const discordAccountId = await resolveDiscordAccountId(ctx, args);

		const cache = createDataAccessCache(ctx);
		return {
			ctx: { ...ctx, cache },
			args: {
				...args,
				userId,
				discordAccountId,
			},
		};
	},
});

export const authenticatedMutation = customMutation(mutation, {
	args: {
		backendAccessToken: v.optional(v.string()),
		discordAccountId: v.optional(v.int64()),
	},
	input: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		const discordAccountId = await resolveDiscordAccountId(ctx, args);

		const cache = createDataAccessCache(ctx);
		return {
			ctx: { ...ctx, cache },
			args: {
				...args,
				userId,
				discordAccountId,
			},
		};
	},
});

export const authenticatedAction = customAction(action, {
	args: {
		backendAccessToken: v.optional(v.string()),
		discordAccountId: v.optional(v.int64()),
	},
	input: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		const discordAccountId = await resolveDiscordAccountId(ctx, args);

		return {
			ctx,
			args: {
				...args,
				userId,
				discordAccountId,
			},
		};
	},
});

function getBackendAccessTokenEnv(): string {
	const token = process.env.BACKEND_ACCESS_TOKEN;
	return token ?? "";
}

export const manageGuildAction = customAction(action, {
	args: {
		backendAccessToken: v.optional(v.string()),
		discordAccountId: v.optional(v.int64()),
		serverId: v.int64(),
	},
	input: async (ctx, args) => {
		const discordAccountId = await resolveDiscordAccountId(ctx, args);

		const backendAccessToken = getBackendAccessTokenEnv();

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
