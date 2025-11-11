import { type Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { discordAccountSchema } from "./schema";

type DiscordAccount = Infer<typeof discordAccountSchema>;

// Helper function to get default discord account (when account is ignored)
function getDefaultDiscordAccount(data: {
	id: string;
	name: string;
}): DiscordAccount {
	return {
		id: data.id,
		name: data.name,
		avatar: undefined,
	};
}

export const getDiscordAccountById = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();
	},
});

export const findManyDiscordAccountsById = query({
	args: {
		ids: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const accounts: DiscordAccount[] = [];
		for (const id of args.ids) {
			const account = await ctx.db
				.query("discordAccounts")
				.filter((q) => q.eq(q.field("id"), id))
				.first();
			if (account) {
				accounts.push(account);
			}
		}
		return accounts;
	},
});

export const createDiscordAccount = mutation({
	args: {
		account: discordAccountSchema,
	},
	handler: async (ctx, args) => {
		// Check if account is ignored
		const ignoredAccount = await ctx.db
			.query("ignoredDiscordAccounts")
			.filter((q) => q.eq(q.field("id"), args.account.id))
			.first();

		if (ignoredAccount) {
			// Return default account if ignored
			return getDefaultDiscordAccount({
				id: args.account.id,
				name: args.account.name,
			});
		}

		// Check if account already exists
		const existing = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.account.id))
			.first();

		if (existing) {
			return existing;
		}

		// Create new account
		await ctx.db.insert("discordAccounts", args.account);
		const created = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.account.id))
			.first();

		if (!created) {
			throw new Error("Failed to create account");
		}

		return created;
	},
});

export const createManyDiscordAccounts = mutation({
	args: {
		accounts: v.array(discordAccountSchema),
	},
	handler: async (ctx, args) => {
		if (args.accounts.length === 0) return [];

		// Get ignored accounts
		const ignoredIds = new Set<string>();
		for (const account of args.accounts) {
			const ignored = await ctx.db
				.query("ignoredDiscordAccounts")
				.filter((q) => q.eq(q.field("id"), account.id))
				.first();
			if (ignored) {
				ignoredIds.add(account.id);
			}
		}

		// Filter out ignored accounts
		const allowedAccounts = args.accounts.filter(
			(acc) => !ignoredIds.has(acc.id),
		);

		// Create accounts in chunks
		const chunkSize = 25;
		for (let i = 0; i < allowedAccounts.length; i += chunkSize) {
			const chunk = allowedAccounts.slice(i, i + chunkSize);
			for (const account of chunk) {
				const existing = await ctx.db
					.query("discordAccounts")
					.filter((q) => q.eq(q.field("id"), account.id))
					.first();

				if (!existing) {
					await ctx.db.insert("discordAccounts", account);
				}
			}
		}

		// Return created accounts (or default for ignored ones)
		return args.accounts.map((acc) => {
			if (ignoredIds.has(acc.id)) {
				return getDefaultDiscordAccount({
					id: acc.id,
					name: acc.name,
				});
			}
			return acc;
		});
	},
});

export const updateDiscordAccount = mutation({
	args: {
		account: discordAccountSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.account.id))
			.first();

		if (!existing) {
			throw new Error("Account not found");
		}

		await ctx.db.patch(existing._id, args.account);

		const updated = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.account.id))
			.first();

		if (!updated) {
			throw new Error("Failed to update account");
		}

		return updated;
	},
});

export const updateManyDiscordAccounts = mutation({
	args: {
		accounts: v.array(discordAccountSchema),
	},
	handler: async (ctx, args) => {
		if (args.accounts.length === 0) return [];

		// Deduplicate by id
		const accountMap = new Map<string, DiscordAccount>();
		for (const account of args.accounts) {
			accountMap.set(account.id, account);
		}
		const uniqueAccounts = Array.from(accountMap.values());

		// Update in chunks
		const chunkSize = 25;
		for (let i = 0; i < uniqueAccounts.length; i += chunkSize) {
			const chunk = uniqueAccounts.slice(i, i + chunkSize);
			for (const account of chunk) {
				const existing = await ctx.db
					.query("discordAccounts")
					.filter((q) => q.eq(q.field("id"), account.id))
					.first();

				if (existing) {
					await ctx.db.patch(existing._id, account);
				}
			}
		}

		// Return updated accounts
		const results: DiscordAccount[] = [];
		for (const account of uniqueAccounts) {
			const updated = await ctx.db
				.query("discordAccounts")
				.filter((q) => q.eq(q.field("id"), account.id))
				.first();
			if (updated) {
				results.push(updated);
			}
		}

		return results;
	},
});

export const upsertDiscordAccount = mutation({
	args: {
		account: discordAccountSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.account.id))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, args.account);
			const updated = await ctx.db
				.query("discordAccounts")
				.filter((q) => q.eq(q.field("id"), args.account.id))
				.first();
			if (!updated) {
				throw new Error("Failed to update account");
			}
			return updated;
		} else {
			// Check if ignored
			const ignored = await ctx.db
				.query("ignoredDiscordAccounts")
				.filter((q) => q.eq(q.field("id"), args.account.id))
				.first();

			if (ignored) {
				return getDefaultDiscordAccount({
					id: args.account.id,
					name: args.account.name,
				});
			}

			await ctx.db.insert("discordAccounts", args.account);
			const created = await ctx.db
				.query("discordAccounts")
				.filter((q) => q.eq(q.field("id"), args.account.id))
				.first();
			if (!created) {
				throw new Error("Failed to create account");
			}
			return created;
		}
	},
});

export const upsertManyDiscordAccounts = mutation({
	args: {
		accounts: v.array(discordAccountSchema),
	},
	handler: async (ctx, args) => {
		if (args.accounts.length === 0) return [];

		// Get existing accounts
		const existingIds = new Set<string>();
		for (const account of args.accounts) {
			const existing = await ctx.db
				.query("discordAccounts")
				.filter((q) => q.eq(q.field("id"), account.id))
				.first();
			if (existing) {
				existingIds.add(account.id);
			}
		}

		// Get ignored accounts
		const ignoredIds = new Set<string>();
		for (const account of args.accounts) {
			const ignored = await ctx.db
				.query("ignoredDiscordAccounts")
				.filter((q) => q.eq(q.field("id"), account.id))
				.first();
			if (ignored) {
				ignoredIds.add(account.id);
			}
		}

		// Process in chunks
		const chunkSize = 25;
		for (let i = 0; i < args.accounts.length; i += chunkSize) {
			const chunk = args.accounts.slice(i, i + chunkSize);
			for (const account of chunk) {
				if (ignoredIds.has(account.id)) {
					continue; // Skip ignored accounts
				}

				if (existingIds.has(account.id)) {
					const existing = await ctx.db
						.query("discordAccounts")
						.filter((q) => q.eq(q.field("id"), account.id))
						.first();
					if (existing) {
						await ctx.db.patch(existing._id, account);
					}
				} else {
					await ctx.db.insert("discordAccounts", account);
				}
			}
		}

		// Return results
		const results: DiscordAccount[] = [];
		for (const account of args.accounts) {
			if (ignoredIds.has(account.id)) {
				results.push(
					getDefaultDiscordAccount({
						id: account.id,
						name: account.name,
					}),
				);
			} else {
				const result = await ctx.db
					.query("discordAccounts")
					.filter((q) => q.eq(q.field("id"), account.id))
					.first();
				if (result) {
					results.push(result);
				}
			}
		}

		return results;
	},
});

export const deleteDiscordAccount = mutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		// Delete the account if it exists
		const existing = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (existing) {
			await ctx.db.delete(existing._id);
		}

		// Add to ignored accounts
		await ctx.runMutation(
			internal.ignored_discord_accounts.upsertIgnoredDiscordAccountInternal,
			{
				id: args.id,
			},
		);

		// Delete messages by user id
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_authorId", (q) => q.eq("authorId", args.id))
			.collect();

		for (const message of messages) {
			await ctx.runMutation(internal.messages.deleteMessageInternal, {
				id: message.id,
			});
		}

		// Delete user server settings
		await ctx.runMutation(
			internal.user_server_settings.deleteUserServerSettingsByUserIdInternal,
			{
				userId: args.id,
			},
		);

		return true;
	},
});
