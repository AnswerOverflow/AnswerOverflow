import { type Infer, v } from "convex/values";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
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
	id: bigint;
	name: string;
}): DiscordAccount {
	return {
		id: data.id,
		name: data.name,
		avatar: undefined,
	};
}

export const upsertDiscordAccount = privateMutation({
	args: {
		account: discordAccountSchema,
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"discordAccounts",
			"by_discordAccountId",
			args.account.id,
			"id",
		);

		if (existing) {
			await ctx.db.patch(existing._id, args.account);
			const updated = await getOneFrom(
				ctx.db,
				"discordAccounts",
				"by_discordAccountId",
				args.account.id,
				"id",
			);
			if (!updated) {
				throw new Error("Failed to update account");
			}
			return updated;
		} else {
			const ignored = await getOneFrom(
				ctx.db,
				"ignoredDiscordAccounts",
				"by_discordAccountId",
				args.account.id,
				"id",
			);

			if (ignored) {
				return getDefaultDiscordAccount({
					id: args.account.id,
					name: args.account.name,
				});
			}

			await ctx.db.insert("discordAccounts", args.account);
			const created = await getOneFrom(
				ctx.db,
				"discordAccounts",
				"by_discordAccountId",
				args.account.id,
				"id",
			);
			if (!created) {
				throw new Error("Failed to create account");
			}
			return created;
		}
	},
});

export const deleteDiscordAccount = privateMutation({
	args: {
		id: v.int64(),
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"discordAccounts",
			"by_discordAccountId",
			args.id,
			"id",
		);

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

const DEFAULT_DELETE_ACCOUNT_BATCH_LIMIT = 10;
const MAX_DELETE_ACCOUNT_BATCH_LIMIT = 25;

function clampDeleteAccountBatchLimit(limit: number | undefined): number {
	return Math.min(
		Math.max(Math.floor(limit ?? DEFAULT_DELETE_ACCOUNT_BATCH_LIMIT), 1),
		MAX_DELETE_ACCOUNT_BATCH_LIMIT,
	);
}

export const deleteDiscordAccountBatch = privateMutation({
	args: {
		id: v.int64(),
		cursor: v.optional(v.union(v.string(), v.null())),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = clampDeleteAccountBatchLimit(args.limit);
		// Take remaining messages from the start. Cursor is a client resume
		// token; Convex paginate cursors skip leftover rows after deletes.
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_authorId", (q) => q.eq("authorId", args.id))
			.take(limit + 1);
		const page = messages.slice(0, limit);
		const hasMore = messages.length > limit;

		for (const message of page) {
			await deleteMessageInternalLogic(ctx, message.id);
		}

		if (hasMore) {
			const lastDeleted = page[page.length - 1];
			return {
				done: false,
				deletedMessages: page.length,
				continueCursor: lastDeleted?.id.toString() ?? args.cursor ?? "",
			};
		}

		const existing = await getOneFrom(
			ctx.db,
			"discordAccounts",
			"by_discordAccountId",
			args.id,
			"id",
		);

		if (existing) {
			await ctx.db.delete(existing._id);
		}

		await upsertIgnoredDiscordAccountInternalLogic(ctx, args.id);
		await deleteUserServerSettingsByUserIdLogic(ctx, args.id);

		return {
			done: true,
			deletedMessages: page.length,
			continueCursor: null,
		};
	},
});

export const findManyDiscordAccountsByIds = privateQuery({
	args: {
		ids: v.array(v.int64()),
	},
	handler: async (ctx, args) => {
		const accounts = await Promise.all(
			args.ids.map((id) => getDiscordAccountByIdShared(ctx, id)),
		);
		return Arr.filter(accounts, Predicate.isNotNullable);
	},
});

export const upsertManyDiscordAccounts = privateMutation({
	args: {
		accounts: v.array(discordAccountSchema),
	},
	handler: async (ctx, args) => {
		if (args.accounts.length === 0) return [];

		const results: Infer<typeof discordAccountSchema>[] = [];

		for (const account of args.accounts) {
			const existing = await getOneFrom(
				ctx.db,
				"discordAccounts",
				"by_discordAccountId",
				account.id,
				"id",
			);

			if (existing) {
				await ctx.db.patch(existing._id, account);
				results.push(account);
			} else {
				const ignored = await getOneFrom(
					ctx.db,
					"ignoredDiscordAccounts",
					"by_discordAccountId",
					account.id,
					"id",
				);

				if (ignored) {
					results.push({
						id: account.id,
						name: account.name,
						avatar: undefined,
					});
				} else {
					await ctx.db.insert("discordAccounts", account);
					results.push(account);
				}
			}
		}

		return results;
	},
});

export const findDiscordAccountsByName = privateQuery({
	args: {
		name: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 100);
		const accounts = await ctx.db
			.query("discordAccounts")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.take(limit);
		return accounts.map((account) => ({
			id: account.id,
			name: account.name,
		}));
	},
});

export const getUserPageHeaderData = privateQuery({
	args: {
		userId: v.int64(),
	},
	handler: async (ctx, args) => {
		const user = await getDiscordAccountByIdShared(ctx, args.userId);
		if (!user) {
			return null;
		}

		// const postMessages = await ctx.db
		// 	.query("messages")
		// 	.withIndex("by_authorId_and_childThreadId", (q) =>
		// 		q.eq("authorId", args.userId).gte("childThreadId", 0n),
		// 	)
		// 	.order("desc")
		// 	.take(50);

		// const serverIds = new Set<bigint>();
		// for (const message of postMessages) {
		// 	serverIds.add(message.serverId);
		// }

		// const servers = Arr.filter(
		// 	await Promise.all(
		// 		Array.from(serverIds).map(async (serverId) => {
		// 			const server = await getOneFrom(
		// 				ctx.db,
		// 				"servers",
		// 				"by_discordId",
		// 				serverId,
		// 			);
		// 			if (!server || server.kickedTime) {
		// 				return null;
		// 			}
		// 			return {
		// 				id: server.discordId.toString(),
		// 				name: server.name,
		// 				icon: server.icon,
		// 				discordId: server.discordId,
		// 			};
		// 		}),
		// 	),
		// 	Predicate.isNotNullable,
		// );

		return {
			user: {
				id: user.id.toString(),
				name: user.name,
				avatar: user.avatar,
			},
			servers: [],
		};
	},
});
