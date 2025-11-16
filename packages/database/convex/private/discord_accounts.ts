import { type Infer, v } from "convex/values";
import { getManyFrom } from "convex-helpers/server/relationships";
import { privateMutation, privateQuery } from "../client";
import { discordAccountSchema } from "../schema";
import {
	deleteMessageInternalLogic,
	deleteUserServerSettingsByUserIdLogic,
	getDiscordAccountById as getDiscordAccountByIdShared,
	upsertIgnoredDiscordAccountInternalLogic,
} from "../shared/shared";

type DiscordAccount = Infer<typeof discordAccountSchema>;

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

export const getDiscordAccountById = privateQuery({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await getDiscordAccountByIdShared(ctx, args.id);
	},
});

export const createDiscordAccount = privateMutation({
	args: {
		account: discordAccountSchema,
	},
	handler: async (ctx, args) => {
		const ignoredAccount = await ctx.db
			.query("ignoredDiscordAccounts")
			.filter((q) => q.eq(q.field("id"), args.account.id))
			.first();

		if (ignoredAccount) {
			return getDefaultDiscordAccount({
				id: args.account.id,
				name: args.account.name,
			});
		}

		const existing = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.account.id))
			.first();

		if (existing) {
			return existing;
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
	},
});

export const createManyDiscordAccounts = privateMutation({
	args: {
		accounts: v.array(discordAccountSchema),
	},
	handler: async (ctx, args) => {
		if (args.accounts.length === 0) return [];

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

		const allowedAccounts = args.accounts.filter(
			(acc) => !ignoredIds.has(acc.id),
		);

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

export const updateDiscordAccount = privateMutation({
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

export const updateManyDiscordAccounts = privateMutation({
	args: {
		accounts: v.array(discordAccountSchema),
	},
	handler: async (ctx, args) => {
		if (args.accounts.length === 0) return [];

		const accountMap = new Map<string, DiscordAccount>();
		for (const account of args.accounts) {
			accountMap.set(account.id, account);
		}
		const uniqueAccounts = Array.from(accountMap.values());

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

export const upsertDiscordAccount = privateMutation({
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

export const upsertManyDiscordAccounts = privateMutation({
	args: {
		accounts: v.array(discordAccountSchema),
	},
	handler: async (ctx, args) => {
		if (args.accounts.length === 0) return [];

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

export const deleteDiscordAccount = privateMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("discordAccounts")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (existing) {
			await ctx.db.delete(existing._id);
		}

		await upsertIgnoredDiscordAccountInternalLogic(ctx, args.id);

		const messages = await getManyFrom(
			ctx.db,
			"messages",
			"by_authorId",
			args.id,
		);

		for (const message of messages) {
			await deleteMessageInternalLogic(ctx, message.id);
		}

		await deleteUserServerSettingsByUserIdLogic(ctx, args.id);

		return true;
	},
});
