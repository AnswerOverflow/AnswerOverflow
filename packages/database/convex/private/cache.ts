import { v } from "convex/values";
import { components } from "../_generated/api";
import { privateMutation, privateQuery } from "../client";

export const findDiscordOAuthAccountByDiscordId = privateQuery({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		const account = await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: "account",
			where: [
				{
					field: "accountId",
					operator: "eq",
					value: args.discordId,
				},
				{
					field: "providerId",
					operator: "eq",
					value: "discord",
				},
			],
		});

		if (
			!account ||
			typeof account !== "object" ||
			!("accountId" in account) ||
			typeof account.accountId !== "string"
		) {
			return null;
		}

		return {
			accountId: account.accountId,
		};
	},
});

export const invalidateUserGuildsCache = privateMutation({
	args: {
		discordAccountId: v.int64(),
	},
	handler: async (ctx, args) => {
		await ctx.runMutation(components.actionCache.lib.remove, {
			name: "discordGuilds",
			args: { discordAccountId: args.discordAccountId },
		});
		return null;
	},
});
