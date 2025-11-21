import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Message } from "../schema";
import {
	enrichedMessageWithServerAndChannels,
	searchMessages,
} from "../shared/data-access";
import { CHANNEL_TYPE } from "../shared/shared";
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

		// todo: get the messages where the discord id matches the channel id
		// @ts-expect-error
		const messages: Message = [];

		const enriched = await enrichedMessageWithServerAndChannels(ctx, messages);
		return {
			page: enriched,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
