import { ActionCache } from "@convex-dev/action-cache";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { Array as Arr, Effect, Option, Predicate, Schema } from "effect";
import { PaginationOpts } from "@packages/confect/server";
import { components, internal } from "../_generated/api";
import { internalAction, internalQuery } from "../client";
import { CHANNEL_TYPE } from "../shared/channels";
import {
	createDataAccessCache,
	enrichMessage,
	enrichMessagesWithServerAndChannels,
	type SearchResult,
	searchMessages,
} from "../shared/dataAccess";
import { findSimilarThreads } from "../shared/similarThreads";
import { publicAction } from "./custom_functions";
import {
	publicQuery as confectPublicQuery,
	ConfectQueryCtx,
	getQueryCtxWithCache,
} from "../client/confectPublic";

const PaginatedSearchResultsSchema = Schema.Struct({
	page: Schema.Array(Schema.Unknown),
	isDone: Schema.Boolean,
	continueCursor: Schema.String,
});

export const publicSearch = confectPublicQuery({
	args: Schema.Struct({
		query: Schema.String,
		serverId: Schema.optional(Schema.String),
		channelId: Schema.optional(Schema.String),
		tagIds: Schema.optional(Schema.Array(Schema.String)),
		paginationOpts: PaginationOpts.PaginationOpts,
	}),
	returns: PaginatedSearchResultsSchema,
	handler: ({ query, serverId, channelId, tagIds, paginationOpts }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;

			const tagIdStrings = tagIds;
			const hasTagFilter = tagIdStrings && tagIdStrings.length > 0;

			if (hasTagFilter && channelId) {
				const tagIdsBigInt = [...tagIdStrings].map((id) => BigInt(id));
				const parentChannelId = BigInt(channelId);

				const threadIdSets = yield* Effect.all(
					tagIdsBigInt.map((tagId) =>
						Effect.gen(function* () {
							const entries = yield* db
								.query("threadTags")
								.withIndex("by_parentChannelId_and_tagId", (q) =>
									q.eq("parentChannelId", parentChannelId).eq("tagId", tagId),
								)
								.collect();
							return new Set([...entries].map((e) => e.threadId));
						}),
					),
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

				const threadSearchResults = yield* db
					.query("channels")
					.withSearchIndex("search_name", (q) =>
						q.search("name", query).eq("parentId", parentChannelId),
					)
					.paginate(paginationOpts);

				const matchingThreads = Arr.filter(
					[...threadSearchResults.page],
					(thread) => threadIdsWithTags.has(thread.id),
				);

				const parentChannelOption = yield* db
					.query("channels")
					.withIndex("by_discordChannelId", (q) => q.eq("id", parentChannelId))
					.first();

				const parentChannel = Option.isSome(parentChannelOption)
					? parentChannelOption.value
					: null;

				const serverOption = parentChannel
					? yield* db
							.query("servers")
							.withIndex("by_discordId", (q) =>
								q.eq("discordId", parentChannel.serverId),
							)
							.first()
					: Option.none();

				const server = Option.isSome(serverOption) ? serverOption.value : null;

				if (!parentChannel || !server) {
					return {
						page: [],
						isDone: true,
						continueCursor: "",
					};
				}

				const resultsWithMessages = yield* Effect.all(
					matchingThreads.map((thread) =>
						Effect.gen(function* () {
							const firstMessageOption = yield* db
								.query("messages")
								.withIndex("by_channelId_and_id", (q) =>
									q.eq("channelId", thread.id),
								)
								.order("asc")
								.first();

							if (Option.isNone(firstMessageOption)) return null;

							const enrichedMessage = yield* Effect.promise(() =>
								enrichMessage(ctxWithCache, firstMessageOption.value),
							);

							if (!enrichedMessage) return null;

							return {
								message: enrichedMessage,
								channel: parentChannel,
								server,
								thread,
							} satisfies SearchResult;
						}),
					),
				);

				return {
					page: Arr.filter(resultsWithMessages, Predicate.isNotNull),
					isDone: threadSearchResults.isDone,
					continueCursor: threadSearchResults.continueCursor,
				};
			}

			const results = yield* Effect.promise(() =>
				searchMessages(ctxWithCache, {
					query,
					serverId: serverId ? BigInt(serverId) : undefined,
					channelId: channelId ? BigInt(channelId) : undefined,
					paginationOpts: {
						numItems: Math.min(paginationOpts.numItems, 50),
						cursor: paginationOpts.cursor,
					},
				}),
			);

			return results;
		}),
});

export const getRecentThreads = confectPublicQuery({
	args: Schema.Struct({
		paginationOpts: PaginationOpts.PaginationOpts,
	}),
	returns: PaginatedSearchResultsSchema,
	handler: ({ paginationOpts }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;

			const paginatedResult = yield* Effect.promise(() =>
				ctx.db
					.query("messages")
					.withIndex("by_childThreadId", (q) => q.gt("childThreadId", 0n))
					.filter((q) => q.neq(q.field("serverId"), 1012610056921038868n))
					.order("desc")
					.paginate(paginationOpts),
			);

			const results = yield* Effect.promise(() =>
				enrichMessagesWithServerAndChannels(ctxWithCache, paginatedResult.page),
			);

			return {
				page: results,
				isDone: paginatedResult.isDone,
				continueCursor: paginatedResult.continueCursor,
			};
		}),
});

export const getSimilarThreads = confectPublicQuery({
	args: Schema.Struct({
		searchQuery: Schema.String,
		currentThreadId: Schema.String,
		currentServerId: Schema.String,
		serverId: Schema.optional(Schema.String),
		limit: Schema.optional(Schema.Number),
	}),
	returns: Schema.Array(Schema.Unknown),
	handler: ({
		searchQuery,
		currentThreadId,
		currentServerId,
		serverId,
		limit,
	}) =>
		Effect.gen(function* () {
			const ctxWithCache = yield* getQueryCtxWithCache;

			const limitValue = Math.min(limit ?? 4, 10);
			const similarThreads = yield* Effect.promise(() =>
				findSimilarThreads(ctxWithCache, {
					searchQuery,
					currentThreadId: BigInt(currentThreadId),
					currentServerId: BigInt(currentServerId),
					serverId: serverId ? BigInt(serverId) : undefined,
					limit: limitValue,
				}),
			);

			return yield* Effect.promise(() =>
				enrichMessagesWithServerAndChannels(ctxWithCache, similarThreads),
			);
		}),
});

export const getRecentAnnouncements = confectPublicQuery({
	args: Schema.Struct({
		serverId: Schema.String,
	}),
	returns: Schema.Array(Schema.Unknown),
	handler: ({ serverId }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;

			const serverIdBigInt = BigInt(serverId);

			const announcementChannels = yield* db
				.query("channels")
				.withIndex("by_serverId_and_type", (q) =>
					q
						.eq("serverId", serverIdBigInt)
						.eq("type", CHANNEL_TYPE.GuildAnnouncement),
				)
				.collect();

			if ([...announcementChannels].length === 0) {
				return [];
			}

			const recentMessagesPerChannel = yield* Effect.all(
				[...announcementChannels].map((channel) =>
					db
						.query("messages")
						.withIndex("by_channelId_and_id", (q) =>
							q.eq("channelId", channel.id),
						)
						.order("desc")
						.take(4),
				),
			);

			const validMessages = Arr.filter(
				recentMessagesPerChannel.flat(),
				Predicate.isNotNullable,
			);

			const sortedMessages = [...validMessages]
				.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0))
				.slice(0, 3);

			return yield* Effect.promise(() =>
				enrichMessagesWithServerAndChannels(ctxWithCache, sortedMessages),
			);
		}),
});

export const getSimilarThreadsInternal = internalQuery({
	args: {
		searchQuery: v.string(),
		currentThreadId: v.string(),
		currentServerId: v.string(),
		serverId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const cache = createDataAccessCache(ctx);
		const ctxWithCache = { ...ctx, cache };
		const limit = Math.min(args.limit ?? 4, 10);
		const similarThreads = await findSimilarThreads(ctxWithCache, {
			searchQuery: args.searchQuery,
			currentThreadId: BigInt(args.currentThreadId),
			currentServerId: BigInt(args.currentServerId),
			serverId: args.serverId ? BigInt(args.serverId) : undefined,
			limit,
		});

		return await enrichMessagesWithServerAndChannels(
			ctxWithCache,
			similarThreads,
		);
	},
});

export const fetchSimilarThreadsInternal = internalAction({
	args: {
		searchQuery: v.string(),
		currentThreadId: v.string(),
		currentServerId: v.string(),
		serverId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<SearchResult[]> => {
		return await ctx.runQuery(
			internal.public.search.getSimilarThreadsInternal,
			args,
		);
	},
});

const getSimilarThreadsCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.public.search.fetchSimilarThreadsInternal,
		name: "similarThreads",
		ttl: 5 * 60 * 1000, // 5 minutes
	});

export const getCachedSimilarThreads = publicAction({
	args: {
		searchQuery: v.string(),
		currentThreadId: v.string(),
		currentServerId: v.string(),
		serverId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<SearchResult[]> => {
		return await getSimilarThreadsCache().fetch(ctx, {
			searchQuery: args.searchQuery,
			currentThreadId: args.currentThreadId,
			currentServerId: args.currentServerId,
			serverId: args.serverId,
			limit: args.limit,
		});
	},
});
