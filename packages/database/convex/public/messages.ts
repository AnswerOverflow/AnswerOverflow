import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { enrichMessages } from "../shared/dataAccess";
import { publicQuery } from "./custom_functions";

export const getMessages = publicQuery({
	args: {
		channelId: v.int64(),
		after: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const { channelId, after, paginationOpts } = args;

		const query = ctx.db
			.query("messages")
			.withIndex("by_channelId_and_id", (q) =>
				q.eq("channelId", channelId).gt("id", after),
			);

		const paginatedResult = await query.order("asc").paginate(paginationOpts);

		const enrichedMessages = await enrichMessages(ctx, paginatedResult.page);

		return {
			page: enrichedMessages,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
