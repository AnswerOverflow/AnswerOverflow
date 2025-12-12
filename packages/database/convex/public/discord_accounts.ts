import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { enrichMessagesWithServerAndChannels } from "../shared/dataAccess";
import {
	messageWithContextValidator,
	paginatedValidator,
} from "../shared/publicSchemas";
import { publicQuery } from "./custom_functions";

export const getUserPosts = publicQuery({
	args: {
		userId: v.int64(),
		serverId: v.optional(v.int64()),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginatedValidator(messageWithContextValidator),
	handler: async (ctx, args) => {
		const serverIdFilter = args.serverId ?? null;

		const paginatedResult = await ctx.db
			.query("messages")
			.withIndex("by_authorId_and_childThreadId", (q) =>
				q.eq("authorId", args.userId).gte("childThreadId", 0n),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const filteredMessages = serverIdFilter
			? paginatedResult.page.filter((m) => m.serverId === serverIdFilter)
			: paginatedResult.page;

		const enrichedPosts = await enrichMessagesWithServerAndChannels(
			ctx,
			filteredMessages,
		);

		return {
			page: enrichedPosts,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
