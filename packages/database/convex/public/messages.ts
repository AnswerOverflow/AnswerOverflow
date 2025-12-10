import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { enrichMessages } from "../shared/dataAccess";
import { publicQuery } from "./custom_functions";

export const getMessagePageReplies = publicQuery({
	args: {
		channelId: v.int64(),
		threadId: v.optional(v.int64()),
		startingFromMessageId: v.optional(v.int64()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const { channelId, threadId, startingFromMessageId, paginationOpts } = args;

		const targetChannelId = threadId ?? channelId;

		let query = ctx.db
			.query("messages")
			.withIndex("by_channelId", (q) => q.eq("channelId", targetChannelId));

		if (startingFromMessageId) {
			query = query.filter((q) => q.gt(q.field("id"), startingFromMessageId));
		}

		const paginatedResult = await query.order("asc").paginate(paginationOpts);

		const enrichedMessages = await enrichMessages(ctx, paginatedResult.page);

		return {
			page: enrichedMessages,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
