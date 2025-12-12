import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
	enrichMessagesWithServerAndChannels,
	searchMessages,
} from "../shared/dataAccess";
import {
	messageWithContextValidator,
	paginatedValidator,
} from "../shared/publicSchemas";
import { findSimilarThreads } from "../shared/similarThreads";
import { publicQuery } from "./custom_functions";

export const publicSearch = publicQuery({
	args: {
		query: v.string(),
		serverId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginatedValidator(messageWithContextValidator),
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
	returns: paginatedValidator(messageWithContextValidator),
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
	returns: v.array(messageWithContextValidator),
	handler: async (ctx, args) => {
		const limit = Math.min(args.limit ?? 4, 10);
		const similarThreads = await findSimilarThreads(ctx, {
			searchQuery: args.searchQuery,
			currentThreadId: BigInt(args.currentThreadId),
			currentServerId: BigInt(args.currentServerId),
			serverId: args.serverId ? BigInt(args.serverId) : undefined,
			limit,
		});

		return await enrichMessagesWithServerAndChannels(ctx, similarThreads);
	},
});
