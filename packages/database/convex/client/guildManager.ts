import { v } from "convex/values";
import {
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import {
	type ActionCtx,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "../_generated/server";
import {
	getDiscordAccountWithToken,
	getUserServerSettingsForServerByDiscordId,
} from "../shared/auth";

async function getDiscordAccountIdForWrapper(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
	const account = await getDiscordAccountWithToken(ctx);
	return account?.accountId ?? null;
}

export const guildManagerQuery = customQuery(query, {
	args: {
		serverId: v.string(),
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
		serverId: v.string(),
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
