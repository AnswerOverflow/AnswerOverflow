import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { internal } from "../_generated/api";
import {
	type ActionCtx,
	action,
	internalQuery,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "../_generated/server";
import { getDiscordAccountWithToken } from "../shared/auth";
import { createDataAccessCache } from "../shared/dataAccess";
import {
	assertGuildManagerPermission,
	checkGuildManagerPermissions,
} from "../shared/guildManagerPermissions";

function validateBackendAccessToken(token: string | undefined): void {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;

	if (!expectedToken) {
		throw new Error("BACKEND_ACCESS_TOKEN is not configured");
	}

	if (token !== expectedToken) {
		throw new Error("Invalid BACKEND_ACCESS_TOKEN");
	}
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

export const guildManagerQuery = customQuery(query, {
	args: {
		backendAccessToken: v.optional(v.string()),
		discordAccountId: v.optional(v.int64()),
		serverId: v.int64(),
	},
	input: async (ctx, args) => {
		const discordAccountId = await resolveDiscordAccountId(ctx, args);
		const permissionResult = await checkGuildManagerPermissions(
			ctx,
			discordAccountId,
			args.serverId,
		);
		assertGuildManagerPermission(permissionResult);
		const cache = createDataAccessCache(ctx);
		return {
			ctx: { ...ctx, cache },
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});

export const checkGuildManagerPermissionsInternal = internalQuery({
	args: {
		discordAccountId: v.int64(),
		serverId: v.int64(),
	},
	handler: async (ctx, args) => {
		return checkGuildManagerPermissions(
			ctx,
			args.discordAccountId,
			args.serverId,
		);
	},
});

export const guildManagerMutation = customMutation(mutation, {
	args: {
		backendAccessToken: v.optional(v.string()),
		discordAccountId: v.optional(v.int64()),
		serverId: v.int64(),
	},
	input: async (ctx, args) => {
		const discordAccountId = await resolveDiscordAccountId(ctx, args);
		const permissionResult = await checkGuildManagerPermissions(
			ctx,
			discordAccountId,
			args.serverId,
		);
		assertGuildManagerPermission(permissionResult);
		const cache = createDataAccessCache(ctx);
		return {
			ctx: { ...ctx, cache },
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});

export const guildManagerAction = customAction(action, {
	args: {
		backendAccessToken: v.optional(v.string()),
		discordAccountId: v.optional(v.int64()),
		serverId: v.int64(),
	},
	input: async (ctx, args) => {
		const discordAccountId = await resolveDiscordAccountId(ctx, args);

		const permissionResult = await ctx.runQuery(
			internal.client.guildManager.checkGuildManagerPermissionsInternal,
			{
				discordAccountId,
				serverId: args.serverId,
			},
		);
		assertGuildManagerPermission(permissionResult);

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});
