import { type Infer, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
	publicInternalMutation,
	publicInternalQuery,
} from "../publicInternal/publicInternal";
import type { ignoredDiscordAccountSchema } from "../schema";
import {
	findIgnoredDiscordAccountById as findIgnoredDiscordAccountByIdShared,
	upsertIgnoredDiscordAccountInternalLogic,
} from "../shared/shared";

type IgnoredDiscordAccount = Infer<typeof ignoredDiscordAccountSchema>;

export const findIgnoredDiscordAccountById = publicInternalQuery({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await findIgnoredDiscordAccountByIdShared(ctx, args.id);
	},
});

export const findManyIgnoredDiscordAccountsById = publicInternalQuery({
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

export const upsertIgnoredDiscordAccount = publicInternalMutation({
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
		return await upsertIgnoredDiscordAccountInternalLogic(ctx, args.id);
	},
});

export const deleteIgnoredDiscordAccount = publicInternalMutation({
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
