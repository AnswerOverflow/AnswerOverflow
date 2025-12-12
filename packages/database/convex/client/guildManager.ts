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
import {
	getDiscordAccountWithToken,
	getUserServerSettingsForServerByDiscordId,
	isSuperUser,
} from "../shared/auth";

async function getDiscordAccountIdForWrapper(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<bigint | null> {
	const account = await getDiscordAccountWithToken(ctx);
	return account?.accountId ?? null;
}

export const guildManagerQuery = customQuery(query, {
	args: {
		serverId: v.int64(),
	},
	input: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);
		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}
		const userServerSettings = await getUserServerSettingsForServerByDiscordId(
			ctx,
			discordAccountId,
			args.serverId,
		);
		if (!userServerSettings) {
			throw new Error(
				"You are not a member of the server you are trying to manage",
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

const ADMINISTRATOR = 0x8;
const MANAGE_GUILD = 0x20;

export const checkGuildManagerPermissions = internalQuery({
	args: {
		discordAccountId: v.int64(),
		serverId: v.int64(),
	},
	handler: async (ctx, args) => {
		const userServerSettings = await getUserServerSettingsForServerByDiscordId(
			ctx,
			args.discordAccountId,
			args.serverId,
		);

		if (!userServerSettings) {
			return {
				hasPermission: false,
				errorMessage: "You are not a member of the server",
			};
		}

		const hasAdminOrManageGuild =
			(userServerSettings.permissions & ADMINISTRATOR) === ADMINISTRATOR ||
			(userServerSettings.permissions & MANAGE_GUILD) === MANAGE_GUILD;

		if (!hasAdminOrManageGuild && !isSuperUser(args.discordAccountId)) {
			return {
				hasPermission: false,
				errorMessage: "Insufficient permissions",
			};
		}

		return { hasPermission: true };
	},
});

export const guildManagerMutation = customMutation(mutation, {
	args: {
		serverId: v.int64(),
	},
	input: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);
		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}
		const userServerSettings = await getUserServerSettingsForServerByDiscordId(
			ctx,
			discordAccountId,
			args.serverId,
		);

		if (!userServerSettings) {
			throw new Error(
				"You are not a member of the server you are trying to manage",
			);
		}

		const hasAdminOrManageGuild =
			(userServerSettings.permissions & ADMINISTRATOR) === ADMINISTRATOR ||
			(userServerSettings.permissions & MANAGE_GUILD) === MANAGE_GUILD;

		if (!hasAdminOrManageGuild && !isSuperUser(discordAccountId)) {
			throw new Error(
				"You are not a member of the server you are trying to manage",
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

export const guildManagerAction = customAction(action, {
	args: {
		serverId: v.int64(),
	},
	input: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);
		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}

		const permissionCheck = await ctx.runQuery(
			internal.client.guildManager.checkGuildManagerPermissions,
			{
				discordAccountId,
				serverId: args.serverId,
			},
		);

		if (!permissionCheck.hasPermission) {
			throw new Error(
				permissionCheck.errorMessage ?? "Insufficient permissions",
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
