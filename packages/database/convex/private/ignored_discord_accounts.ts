import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { privateMutation, privateQuery } from "../client";
import { findIgnoredDiscordAccountById as findIgnoredDiscordAccountByIdShared } from "../shared/shared";

export const findIgnoredDiscordAccountById = privateQuery({
	args: {
		id: v.int64(),
	},
	handler: async (ctx, args) => {
		return await findIgnoredDiscordAccountByIdShared(ctx, args.id);
	},
});

export const deleteIgnoredDiscordAccount = privateMutation({
	args: {
		id: v.int64(),
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"ignoredDiscordAccounts",
			"by_discordAccountId",
			args.id,
			"id",
		);

		if (existing) {
			await ctx.db.delete(existing._id);
		}

		const deleted = await getOneFrom(
			ctx.db,
			"ignoredDiscordAccounts",
			"by_discordAccountId",
			args.id,
			"id",
		);

		if (deleted) {
			throw new Error("Failed to delete account");
		}

		return true;
	},
});
