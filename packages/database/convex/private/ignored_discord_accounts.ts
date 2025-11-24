import { v } from "convex/values";
import { privateMutation, privateQuery } from "../client";
import { findIgnoredDiscordAccountById as findIgnoredDiscordAccountByIdShared } from "../shared/shared";

export const findIgnoredDiscordAccountById = privateQuery({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await findIgnoredDiscordAccountByIdShared(ctx, args.id);
	},
});

export const upsertIgnoredDiscordAccount = privateMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		const existingAccount = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (existingAccount) {
			throw new Error("Account is not ignored");
		}

		const existingIgnored = await ctx.db
			.query("ignoredDiscordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (existingIgnored) {
			return existingIgnored;
		}

		await ctx.db.insert("ignoredDiscordAccounts", { id: args.id });

		const upserted = await ctx.db
			.query("ignoredDiscordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (!upserted) {
			throw new Error("Failed to upsert account");
		}

		return upserted;
	},
});

export const deleteIgnoredDiscordAccount = privateMutation({
	args: {
		id: v.string(),
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
