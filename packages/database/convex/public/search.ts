import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { internal } from "../_generated/api";
import { isChannelIndexingEnabled } from "../shared/channels";
import {
	enrichedMessageWithServerAndChannels,
	searchMessages,
} from "../shared/dataAccess";
import { findSolutionsByQuestionId } from "../shared/messages";
import {
	CHANNEL_TYPE,
	getDiscordAccountById,
	getFirstMessageInChannel,
	getThreadStartMessage,
	isThreadType,
} from "../shared/shared";
import { findSimilarThreadCandidates } from "../shared/similarThreads";
import { publicQuery } from "./custom_functions";

export const publicSearch = publicQuery({
	args: {
		query: v.string(),
		serverId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const results = await searchMessages(ctx, {
			query: args.query,
			serverId: args.serverId ? BigInt(args.serverId) : undefined,
			paginationOpts: {
				numItems: Math.min(args.paginationOpts.numItems, 50),
				cursor: args.paginationOpts.cursor,
			},
		});

		return results;
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
					if (!threadChannel.parentId) {
						return null;
					}

					const server = await getOneFrom(
						ctx.db,
						"servers",
						"by_discordId",
						threadChannel.serverId,
					);
					if (!server || server.kickedTime) {
						return null;
					}

					const indexingEnabled = await isChannelIndexingEnabled(
						ctx,
						threadChannel.id,
						threadChannel.parentId,
					);
					if (!indexingEnabled) {
						return null;
					}

					const threadStartMessage = await getThreadStartMessage(
						ctx,
						threadChannel.id,
					);

					if (!threadStartMessage) {
						return null;
					}
					const enriched = await enrichedMessageWithServerAndChannels(
						ctx,
						threadStartMessage,
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

export const getSimilarThreads = publicQuery({
	args: {
		searchQuery: v.string(),
		currentThreadId: v.string(),
		currentServerId: v.string(),
		serverId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = Math.min(args.limit ?? 4, 10);
		const candidates = await findSimilarThreadCandidates(ctx, {
			searchQuery: args.searchQuery,
			currentThreadId: BigInt(args.currentThreadId),
			currentServerId: BigInt(args.currentServerId),
			serverId: args.serverId ? BigInt(args.serverId) : undefined,
			limit,
		});

		const results: Array<{
			thread: { id: string; name: string; serverId: string };
			server: { discordId: string; name: string; icon?: string };
			channel: { id: string; name: string };
			firstMessageId: string;
			firstMessageContent: string;
			hasSolution: boolean;
		}> = [];

		for (const candidate of candidates) {
			if (results.length >= limit) break;

			const messagePage = await ctx.runQuery(
				internal.private.messages.getThreadMessagePageInternal,
				{ threadId: candidate.threadId },
			);

			if (!messagePage || messagePage.messages.length === 0) continue;

			const firstEnrichedMessage = messagePage.messages[0];
			if (!firstEnrichedMessage) continue;

			const firstMessage = firstEnrichedMessage.message;

			const solutions = await findSolutionsByQuestionId(
				ctx,
				firstMessage.id,
				1,
			);
			const hasSolution = solutions.length > 0;

			results.push({
				thread: {
					id:
						messagePage.thread?.id.toString() ?? candidate.threadId.toString(),
					name: messagePage.thread?.name ?? "",
					serverId: candidate.serverId.toString(),
				},
				server: {
					discordId: messagePage.server.discordId.toString(),
					name: messagePage.server.name,
					icon: messagePage.server.icon,
				},
				channel: {
					id: messagePage.channel.id.toString(),
					name: messagePage.channel.name,
				},
				firstMessageId: firstMessage.id.toString(),
				firstMessageContent: firstMessage.content.slice(0, 200),
				hasSolution,
			});
		}

		return results;
	},
});
