import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import {
	enrichedMessageWithServerAndChannels,
	searchMessages,
} from "../shared/dataAccess";
import {
	CHANNEL_TYPE,
	getDiscordAccountById,
	getFirstMessageInChannel,
	isThreadType,
} from "../shared/shared";
import { publicQuery } from "./custom_functions";

export const publicSearch = publicQuery({
	args: {
		query: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		return searchMessages(ctx, {
			query: args.query,
			paginationOpts: {
				numItems: Math.min(args.paginationOpts.numItems, 10),
				cursor: args.paginationOpts.cursor,
			},
		});
	},
});

export const getRecentThreads = publicQuery({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_type_and_id", (q) =>
				q.eq("type", CHANNEL_TYPE.PublicThread),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const results = Arr.filter(
			await Promise.all(
				paginatedResult.page.map(async (threadChannel) => {
					const firstMessage = await getFirstMessageInChannel(
						ctx,
						threadChannel.id,
					);
					if (!firstMessage) {
						return null;
					}
					const enriched = await enrichedMessageWithServerAndChannels(
						ctx,
						firstMessage,
					);
					if (!enriched) {
						return null;
					}
					return {
						...enriched,
						thread: threadChannel,
						channel: enriched.channel,
					};
				}),
			),
			Predicate.isNotNullable,
		);

		return {
			page: results,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});

export const getUserById = publicQuery({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = BigInt(args.userId);
		const user = await getDiscordAccountById(ctx, userId);
		if (!user) {
			return null;
		}
		return {
			id: user.id.toString(),
			name: user.name,
			avatar: user.avatar,
		};
	},
});

export const getUserPosts = publicQuery({
	args: {
		userId: v.string(),
		serverId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const userId = BigInt(args.userId);

		const paginatedResult = await ctx.db
			.query("messages")
			.withIndex("by_authorId", (q) => q.eq("authorId", userId))
			.order("desc")
			.paginate(args.paginationOpts);

		const serverIdFilter = args.serverId ? BigInt(args.serverId) : null;

		const results = Arr.filter(
			await Promise.all(
				paginatedResult.page.map(async (message) => {
					if (serverIdFilter && message.serverId !== serverIdFilter) {
						return null;
					}

					const channel = await getOneFrom(
						ctx.db,
						"channels",
						"by_discordChannelId",
						message.channelId,
						"id",
					);

					if (!channel || !isThreadType(channel.type)) {
						return null;
					}

					const firstMessage = await getFirstMessageInChannel(ctx, channel.id);
					if (!firstMessage || firstMessage.id !== message.id) {
						return null;
					}

					const enriched = await enrichedMessageWithServerAndChannels(
						ctx,
						message,
					);
					if (!enriched) {
						return null;
					}
					return enriched;
				}),
			),
			Predicate.isNotNullable,
		);

		return {
			page: results,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});

export const getUserComments = publicQuery({
	args: {
		userId: v.string(),
		serverId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const userId = BigInt(args.userId);

		const paginatedResult = await ctx.db
			.query("messages")
			.withIndex("by_authorId", (q) => q.eq("authorId", userId))
			.order("desc")
			.paginate(args.paginationOpts);

		const serverIdFilter = args.serverId ? BigInt(args.serverId) : null;

		const results = Arr.filter(
			await Promise.all(
				paginatedResult.page.map(async (message) => {
					if (serverIdFilter && message.serverId !== serverIdFilter) {
						return null;
					}

					const channel = await getOneFrom(
						ctx.db,
						"channels",
						"by_discordChannelId",
						message.channelId,
						"id",
					);

					if (!channel || !isThreadType(channel.type)) {
						return null;
					}

					const firstMessage = await getFirstMessageInChannel(ctx, channel.id);
					if (!firstMessage || firstMessage.id === message.id) {
						return null;
					}

					const enriched = await enrichedMessageWithServerAndChannels(
						ctx,
						message,
					);
					if (!enriched) {
						return null;
					}
					return enriched;
				}),
			),
			Predicate.isNotNullable,
		);

		return {
			page: results,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});

export const getServersUserHasPostedIn = publicQuery({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = BigInt(args.userId);

		const messages = await getManyFrom(
			ctx.db,
			"messages",
			"by_authorId",
			userId,
			"authorId",
		);

		const serverIds = new Set<bigint>();
		for (const message of messages) {
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

		return servers;
	},
});

export const getUserPageData = publicQuery({
	args: {
		userId: v.string(),
		serverId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const userId = BigInt(args.userId);
		const user = await getDiscordAccountById(ctx, userId);
		if (!user) {
			return null;
		}

		const allMessages = await getManyFrom(
			ctx.db,
			"messages",
			"by_authorId",
			userId,
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

		const serverIdFilter = args.serverId ? BigInt(args.serverId) : null;
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
