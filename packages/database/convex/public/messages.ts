import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { createDataAccessCache, enrichMessage } from "../shared/dataAccess";
import { paginateWithFilter } from "../shared/pagination";
import { publicQuery } from "./custom_functions";

export const getMessages = publicQuery({
	args: {
		channelId: v.int64(),
		after: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const { channelId, after, paginationOpts } = args;
		const cache = createDataAccessCache(ctx);

		return paginateWithFilter(
			paginationOpts,
			(opts) =>
				ctx.db
					.query("messages")
					.withIndex("by_channelId_and_id", (q) =>
						q.eq("channelId", channelId).gt("id", after),
					)
					.order("asc")
					.paginate(opts),
			(messages) =>
				Promise.all(messages.map((m) => enrichMessage(ctx, cache, m))),
		);
	},
});
