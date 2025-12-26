import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { Array as Arr, Predicate } from "effect";
import { CHANNEL_TYPE } from "../shared/channels";
import {
	enrichMessage,
	enrichMessagesWithServerAndChannels,
	searchMessages,
	type SearchResult,
} from "../shared/dataAccess";
import { findSimilarThreads } from "../shared/similarThreads";
import { publicQuery } from "./custom_functions";

export const publicSearch = publicQuery({
	args: {
		query: v.string(),
		serverId: v.optional(v.string()),
		channelId: v.optional(v.string()),
		tagIds: v.optional(v.array(v.string())),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const tagIdStrings = args.tagIds;
		const hasTagFilter = tagIdStrings && tagIdStrings.length > 0;

		if (hasTagFilter && args.channelId) {
			const tagIds = tagIdStrings.map((id) => BigInt(id));
			const parentChannelId = BigInt(args.channelId);

			const threadIdSets: Array<Set<bigint>> = await asyncMap(
				tagIds,
				async (tagId) => {
					const entries = await ctx.db
						.query("threadTags")
						.withIndex("by_parentChannelId_and_tagId", (q) =>
							q.eq("parentChannelId", parentChannelId).eq("tagId", tagId),
						)
						.collect();
					return new Set(entries.map((e) => e.threadId));
				},
			);

			const threadIdsWithTags = new Set<bigint>();
			for (const set of threadIdSets) {
				for (const id of set) {
					threadIdsWithTags.add(id);
				}
			}

			if (threadIdsWithTags.size === 0) {
				return {
					page: [],
					isDone: true,
					continueCursor: "",
				};
			}

			const threadSearchResults = await ctx.db
				.query("channels")
				.withSearchIndex("search_name", (q) =>
					q.search("name", args.query).eq("parentId", parentChannelId),
				)
				.paginate(args.paginationOpts);

			const matchingThreads = Arr.filter(threadSearchResults.page, (thread) =>
				threadIdsWithTags.has(thread.id),
			);

			const parentChannel = await ctx.db
				.query("channels")
				.withIndex("by_discordChannelId", (q) => q.eq("id", parentChannelId))
				.unique();

			const server = parentChannel
				? await ctx.db
						.query("servers")
						.withIndex("by_discordId", (q) =>
							q.eq("discordId", parentChannel.serverId),
						)
						.unique()
				: null;

			if (!parentChannel || !server) {
				return {
					page: [],
					isDone: true,
					continueCursor: "",
				};
			}

			const resultsWithMessages = await asyncMap(
				matchingThreads,
				async (thread) => {
					const firstMessage = await ctx.db
						.query("messages")
						.withIndex("by_channelId_and_id", (q) =>
							q.eq("channelId", thread.id),
						)
						.order("asc")
						.first();

					if (!firstMessage) return null;

					const enrichedMessage = await enrichMessage(ctx, firstMessage);
					if (!enrichedMessage) return null;

					return {
						message: enrichedMessage,
						channel: parentChannel,
						server,
						thread,
					} satisfies SearchResult;
				},
			);

			return {
				page: Arr.filter(resultsWithMessages, Predicate.isNotNull),
				isDone: threadSearchResults.isDone,
				continueCursor: threadSearchResults.continueCursor,
			};
		}

		return await searchMessages(ctx, {
			query: args.query,
			serverId: args.serverId ? BigInt(args.serverId) : undefined,
			channelId: args.channelId ? BigInt(args.channelId) : undefined,
			paginationOpts: {
				numItems: Math.min(args.paginationOpts.numItems, 50),
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
			.query("messages")
			.withIndex("by_childThreadId", (q) => q.gt("childThreadId", 0n))
			.order("desc")
			.paginate(args.paginationOpts);

		const results = await enrichMessagesWithServerAndChannels(
			ctx,
			paginatedResult.page,
		);

		return {
			page: results,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
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
		const similarThreads = await findSimilarThreads(ctx, {
			searchQuery: args.searchQuery,
			currentThreadId: BigInt(args.currentThreadId),
			currentServerId: BigInt(args.currentServerId),
			serverId: args.serverId ? BigInt(args.serverId) : undefined,
			limit,
		});

		// todo: we're doing double lookups here, not great
		return await enrichMessagesWithServerAndChannels(ctx, similarThreads);
	},
});

export const getRecentAnnouncements = publicQuery({
	args: {
		serverId: v.string(),
	},
	handler: async (ctx, args) => {
		const serverId = BigInt(args.serverId);

		const announcementChannels = await ctx.db
			.query("channels")
			.withIndex("by_serverId_and_type", (q) =>
				q.eq("serverId", serverId).eq("type", CHANNEL_TYPE.GuildAnnouncement),
			)
			.collect();

		if (announcementChannels.length === 0) {
			return [];
		}

		const recentMessagesPerChannel = await asyncMap(
			announcementChannels,
			async (channel) => {
				const message = await ctx.db
					.query("messages")
					.withIndex("by_channelId_and_id", (q) =>
						q.eq("channelId", channel.id),
					)
					.order("desc")
					.take(4);
				return message;
			},
		);

		const validMessages = Arr.filter(
			recentMessagesPerChannel.flat(),
			Predicate.isNotNullable,
		);

		const sortedMessages = validMessages
			.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0))
			.slice(0, 3);

		return enrichMessagesWithServerAndChannels(ctx, sortedMessages);
	},
});
