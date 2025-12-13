import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
	createDataAccessCache,
	enrichedMessageWithServerAndChannelsInternal,
} from "../shared/dataAccess";
import { paginateWithFilter } from "../shared/pagination";
import { publicQuery } from "./custom_functions";

export const getUserPosts = publicQuery({
	args: {
		userId: v.int64(),
		serverId: v.optional(v.int64()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const serverIdFilter = args.serverId ?? null;
		const cache = createDataAccessCache(ctx);

		return paginateWithFilter(
			args.paginationOpts,
			(paginationOpts) =>
				ctx.db
					.query("messages")
					.withIndex("by_authorId_and_childThreadId", (q) =>
						q.eq("authorId", args.userId).gte("childThreadId", 0n),
					)
					.order("desc")
					.paginate(paginationOpts),
			async (messages) => {
				const filtered = serverIdFilter
					? messages.filter((m) => m.serverId === serverIdFilter)
					: messages;
				return Promise.all(
					filtered.map((m) =>
						enrichedMessageWithServerAndChannelsInternal(ctx, cache, m),
					),
				);
			},
		);
	},
});
