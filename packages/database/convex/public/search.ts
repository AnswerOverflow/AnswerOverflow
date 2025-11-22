import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { Array as Arr, Predicate } from "effect";
import {
	enrichedMessageWithServerAndChannels,
	searchMessages,
} from "../shared/dataAccess";
import { CHANNEL_TYPE, getFirstMessageInChannel } from "../shared/shared";
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
			.withIndex("by_type", (q) => q.eq("type", CHANNEL_TYPE.PublicThread))
			.order("desc")
			.paginate(args.paginationOpts);

		const results = await Promise.all(
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
		);

		const filteredResults = Arr.filter(results, Predicate.isNotNullable);

		return {
			page: filteredResults,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
