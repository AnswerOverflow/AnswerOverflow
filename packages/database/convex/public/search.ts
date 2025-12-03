import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { isChannelIndexingEnabled } from "../shared/channels";
import {
	enrichedMessageWithServerAndChannels,
	searchMessages,
} from "../shared/dataAccess";
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
		const serverIdFilter = args.serverId ? BigInt(args.serverId) : null;

		const paginatedResult = await ctx.db
			.query("messages")
			.withIndex("by_authorId_and_childThreadId", (q) =>
				q.eq("authorId", userId).gte("childThreadId", 0n),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const results = Arr.filter(
			await Promise.all(
				paginatedResult.page.map(async (message) => {
					if (serverIdFilter && message.serverId !== serverIdFilter) {
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
		const serverIdFilter = args.serverId ? BigInt(args.serverId) : null;

		const paginatedResult = await ctx.db
			.query("messages")
			.withIndex("by_authorId", (q) => q.eq("authorId", userId))
			.order("desc")
			.paginate(args.paginationOpts);

		const results = Arr.filter(
			await Promise.all(
				paginatedResult.page.map(async (message) => {
					if (message.childThreadId !== undefined) {
						return null;
					}

					if (serverIdFilter && message.serverId !== serverIdFilter) {
						return null;
					}

					if (message.parentChannelId === undefined) {
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

		const posts = await ctx.db
			.query("messages")
			.withIndex("by_authorId_and_childThreadId", (q) =>
				q.eq("authorId", userId).gte("childThreadId", 0n),
			)
			.order("desc")
			.take(100);

		const serverIds = new Set<bigint>();
		for (const message of posts) {
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

		const serverIdFilter = args.serverId ? BigInt(args.serverId) : null;
		const limit = args.limit ?? 10;
		const scanLimit = limit * 5;

		const postMessages = await ctx.db
			.query("messages")
			.withIndex("by_authorId_and_childThreadId", (q) =>
				q.eq("authorId", userId).gte("childThreadId", 0n),
			)
			.order("desc")
			.take(scanLimit);

		const filteredPostMessages = serverIdFilter
			? postMessages.filter((m) => m.serverId === serverIdFilter)
			: postMessages;

		const posts = Arr.filter(
			await Promise.all(
				filteredPostMessages
					.slice(0, limit)
					.map((message) => enrichedMessageWithServerAndChannels(ctx, message)),
			),
			Predicate.isNotNullable,
		);

		const commentMessages = await ctx.db
			.query("messages")
			.withIndex("by_authorId", (q) => q.eq("authorId", userId))
			.order("desc")
			.take(scanLimit);

		const filteredCommentMessages = commentMessages.filter((m) => {
			if (m.childThreadId !== undefined) return false;
			if (m.parentChannelId === undefined) return false;
			if (serverIdFilter && m.serverId !== serverIdFilter) return false;
			return true;
		});

		const comments = Arr.filter(
			await Promise.all(
				filteredCommentMessages
					.slice(0, limit)
					.map((message) => enrichedMessageWithServerAndChannels(ctx, message)),
			),
			Predicate.isNotNullable,
		);

		const serverIds = new Set<bigint>();
		for (const message of postMessages) {
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

		return candidates.map((candidate) => ({
			thread: {
				id: candidate.thread.id.toString(),
				name: candidate.thread.name,
				serverId: candidate.thread.serverId.toString(),
			},
			server: {
				discordId: candidate.server.discordId.toString(),
				name: candidate.server.name,
				icon: candidate.server.icon,
			},
			channel: {
				id: candidate.channel.id.toString(),
				name: candidate.channel.name,
			},
			firstMessageId: candidate.firstMessageId.toString(),
			firstMessageContent: candidate.firstMessageContent,
			hasSolution: candidate.hasSolution,
		}));
	},
});
