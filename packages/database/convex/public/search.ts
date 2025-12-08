import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { isChannelIndexingEnabled } from "../shared/channels";
import {
	enrichedMessageWithServerAndChannels,
	searchMessages,
} from "../shared/dataAccess";
import { CHANNEL_TYPE, getThreadStartMessage } from "../shared/shared";
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
						threadChannel,
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
