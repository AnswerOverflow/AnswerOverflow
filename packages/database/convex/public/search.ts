import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { Array as Arr, Predicate } from "effect";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../client";
import { CHANNEL_TYPE } from "../shared/channels";
import {
	createDataAccessCache,
	enrichMessage,
	enrichMessagesWithServerAndChannels,
	type SearchResult,
	searchMessages,
} from "../shared/dataAccess";
import { getThreadStartMessage } from "../shared/messages";
import { findSimilarThreads } from "../shared/similarThreads";
import { publicAction, publicQuery } from "./custom_functions";

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
			// todo maybe bring back in future but is too noisy right now
			.filter((q) =>
				q.and(
					q.neq(q.field("serverId"), 1012610056921038868n),
					q.neq(q.field("serverId"), 1457741299041046581n),
				),
			)
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
		currentParentChannelId: v.optional(v.string()),
		serverId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = Math.min(args.limit ?? 4, 10);
		const similarThreads = await findSimilarThreads(ctx, {
			searchQuery: args.searchQuery,
			currentThreadId: BigInt(args.currentThreadId),
			currentServerId: BigInt(args.currentServerId),
			currentParentChannelId: args.currentParentChannelId
				? BigInt(args.currentParentChannelId)
				: undefined,
			serverId: args.serverId ? BigInt(args.serverId) : undefined,
			limit,
		});

		return await enrichMessagesWithServerAndChannels(ctx, similarThreads);
	},
});

// Stored similar-thread lists older than this are recomputed on next view. This
// bounds staleness (so newly-created threads eventually surface) without paying
// for a full-text search on every page render.
const SIMILAR_THREADS_STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Runs the actual full-text search. This is the only billed search work for the
// "similar threads" feature, and it now runs at most once per thread per
// `SIMILAR_THREADS_STALE_MS` window instead of once per page view.
export const computeSimilarThreadsInternal = internalQuery({
	args: {
		searchQuery: v.string(),
		currentThreadId: v.string(),
		currentServerId: v.string(),
		currentParentChannelId: v.optional(v.string()),
		serverId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (
		ctx,
		args,
	): Promise<{ similarThreadIds: bigint[]; results: SearchResult[] }> => {
		const cache = createDataAccessCache(ctx);
		const ctxWithCache = { ...ctx, cache };
		const limit = Math.min(args.limit ?? 4, 10);
		const startMessages = await findSimilarThreads(ctxWithCache, {
			searchQuery: args.searchQuery,
			currentThreadId: BigInt(args.currentThreadId),
			currentServerId: BigInt(args.currentServerId),
			currentParentChannelId: args.currentParentChannelId
				? BigInt(args.currentParentChannelId)
				: undefined,
			serverId: args.serverId ? BigInt(args.serverId) : undefined,
			limit,
		});

		// A thread's start message lives in the thread channel, so its channelId
		// is the thread id we store and re-resolve on subsequent reads.
		const similarThreadIds = startMessages.map((m) => m.channelId);
		const results = await enrichMessagesWithServerAndChannels(
			ctxWithCache,
			startMessages,
		);
		return { similarThreadIds, results };
	},
});

// Reads the precomputed list and resolves it to enriched results. Performs no
// full-text search. Returns null when the thread has never been computed or the
// stored entry is stale, signalling the caller to recompute.
export const getStoredSimilarThreads = internalQuery({
	args: {
		currentThreadId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<SearchResult[] | null> => {
		const threadId = BigInt(args.currentThreadId);
		const stored = await ctx.db
			.query("similarThreads")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();

		if (!stored || Date.now() - stored.computedAt > SIMILAR_THREADS_STALE_MS) {
			return null;
		}

		const cache = createDataAccessCache(ctx);
		const ctxWithCache = { ...ctx, cache };
		const limit = Math.min(args.limit ?? 4, 10);
		const startMessages = await asyncMap(
			stored.similarThreadIds.slice(0, limit),
			(id) => getThreadStartMessage(ctxWithCache, id),
		);
		return await enrichMessagesWithServerAndChannels(
			ctxWithCache,
			Arr.filter(startMessages, Predicate.isNotNullable),
		);
	},
});

export const storeSimilarThreads = internalMutation({
	args: {
		currentThreadId: v.string(),
		similarThreadIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const threadId = BigInt(args.currentThreadId);
		const similarThreadIds = args.similarThreadIds.map((id) => BigInt(id));
		const computedAt = Date.now();

		const existing = await ctx.db
			.query("similarThreads")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, { similarThreadIds, computedAt });
		} else {
			await ctx.db.insert("similarThreads", {
				threadId,
				similarThreadIds,
				computedAt,
			});
		}
	},
});

export const getCachedSimilarThreads = publicAction({
	args: {
		searchQuery: v.string(),
		currentThreadId: v.string(),
		currentServerId: v.string(),
		currentParentChannelId: v.optional(v.string()),
		serverId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<SearchResult[]> => {
		// The persistent store is keyed by thread id and assumes the search query
		// is the thread's title (the website's thread-page usage). Callers that
		// pass an arbitrary query without a parent-channel scope — e.g. the MCP
		// tool, which sends currentThreadId "0" — must bypass the store so they
		// don't collide on a shared key. findSimilarThreads already returns []
		// without a parent channel, so this path does no search work.
		if (!args.currentParentChannelId) {
			const { results } = await ctx.runQuery(
				internal.public.search.computeSimilarThreadsInternal,
				args,
			);
			return results;
		}

		// Fast path: serve the precomputed list (no full-text search).
		const stored = await ctx.runQuery(
			internal.public.search.getStoredSimilarThreads,
			{ currentThreadId: args.currentThreadId, limit: args.limit },
		);
		if (stored !== null) {
			return stored;
		}

		// Cold/stale path: search once, persist for future views, then return.
		const { similarThreadIds, results } = await ctx.runQuery(
			internal.public.search.computeSimilarThreadsInternal,
			args,
		);
		await ctx.runMutation(internal.public.search.storeSimilarThreads, {
			currentThreadId: args.currentThreadId,
			similarThreadIds: similarThreadIds.map(String),
		});
		return results;
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
