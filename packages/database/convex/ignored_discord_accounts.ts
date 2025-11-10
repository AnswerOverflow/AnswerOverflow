import { type Infer, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { ignoredDiscordAccountSchema } from "./schema";

type IgnoredDiscordAccount = Infer<typeof ignoredDiscordAccountSchema>;

export const findIgnoredDiscordAccountById = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("ignoredDiscordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();
	},
});

export const findManyIgnoredDiscordAccountsById = query({
	args: {
		ids: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const accounts: IgnoredDiscordAccount[] = [];
		for (const id of args.ids) {
			const account = await ctx.db
				.query("ignoredDiscordAccounts")
				.filter((q) => q.eq(q.field("id"), id))
				.first();
			if (account) {
				accounts.push(account);
			}
		}
		return accounts;
	},
});

export const upsertIgnoredDiscordAccount = mutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if account exists (should not exist if we're ignoring it)
		const existingAccount = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (existingAccount) {
			throw new Error("Account is not ignored");
		}

		// Upsert ignored account
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

export const upsertIgnoredDiscordAccountInternal = internalMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		// Upsert ignored account (no check for existing account in internal version)
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

export const deleteIgnoredDiscordAccount = mutation({
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

		// Verify deletion
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
