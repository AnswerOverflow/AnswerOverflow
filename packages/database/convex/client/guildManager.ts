import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import {
	type ActionCtx,
	action,
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
		const ADMINISTRATOR = 0x8;
		const MANAGE_GUILD = 0x20;

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

		return {
			ctx,
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});
