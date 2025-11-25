import { v } from "convex/values";
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
		const existing = await ctx.db
			.query("ignoredDiscordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (existing) {
			await ctx.db.delete(existing._id);
		}

		const deleted = await ctx.db
			.query("ignoredDiscordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (deleted) {
			throw new Error("Failed to delete account");
		}

		return true;
	},
});
