import { type Infer, v } from "convex/values";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { privateMutation, privateQuery } from "../client";
import { discordAccountSchema } from "../schema";
import { enrichedMessageWithServerAndChannels } from "../shared/dataAccess";
import {
	deleteMessageInternalLogic,
	deleteUserServerSettingsByUserIdLogic,
	getDiscordAccountById as getDiscordAccountByIdShared,
	getFirstMessageInChannel,
	isThreadType,
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

export const getDiscordAccountById = privateQuery({
	args: {
		id: v.int64(),
	},
	handler: async (ctx, args) => {
		return await getDiscordAccountByIdShared(ctx, args.id);
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

export const deleteDiscordAccount = privateMutation({
	args: {
		id: v.int64(),
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

export const getUserPageData = privateQuery({
	args: {
		userId: v.int64(),
		serverId: v.optional(v.int64()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getDiscordAccountByIdShared(ctx, args.userId);
		if (!user) {
			return null;
		}

		const allMessages = await getManyFrom(
			ctx.db,
			"messages",
			"by_authorId",
			args.userId,
			"authorId",
		);

		const serverIds = new Set<bigint>();
		for (const message of allMessages) {
			serverIds.add(message.serverId);
		}

		const servers = Arr.filter(
			await Promise.all(
				Array.from(serverIds).map(async (serverId) => {
					const server = await getOneFrom(
						ctx.db,
						"servers",
						"by_discordId",
						serverId,
					);
					if (!server || server.kickedTime) {
						return null;
					}
					return {
						id: server.discordId.toString(),
						name: server.name,
						icon: server.icon,
						discordId: server.discordId,
					};
				}),
			),
			Predicate.isNotNullable,
		);

		const serverIdFilter = args.serverId ?? null;
		const limit = args.limit ?? 10;

		const filteredMessages = serverIdFilter
			? allMessages.filter((m) => m.serverId === serverIdFilter)
			: allMessages;

		const sortedMessages = filteredMessages.sort((a, b) =>
			a.id > b.id ? -1 : a.id < b.id ? 1 : 0,
		);

		const posts = [];
		const comments = [];

		for (const message of sortedMessages) {
			if (posts.length >= limit && comments.length >= limit) {
				break;
			}

			const channel = await getOneFrom(
				ctx.db,
				"channels",
				"by_discordChannelId",
				message.channelId,
				"id",
			);

			if (!channel || !isThreadType(channel.type)) {
				continue;
			}

			const firstMessage = await getFirstMessageInChannel(ctx, channel.id);
			if (!firstMessage) {
				continue;
			}

			const enriched = await enrichedMessageWithServerAndChannels(ctx, message);
			if (!enriched) {
				continue;
			}

			if (firstMessage.id === message.id && posts.length < limit) {
				posts.push(enriched);
			} else if (firstMessage.id !== message.id && comments.length < limit) {
				comments.push(enriched);
			}
		}

		return {
			user: {
				id: user.id.toString(),
				name: user.name,
				avatar: user.avatar,
			},
			servers,
			posts,
			comments,
		};
	},
});
