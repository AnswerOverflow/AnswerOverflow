import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { Array as Arr, Predicate } from "effect";
import { enrichedMessageWithServerAndChannels } from "../shared/dataAccess";
import { publicQuery } from "./custom_functions";

export const getUserPosts = publicQuery({
	args: {
		userId: v.int64(),
		serverId: v.optional(v.int64()),
		paginationOpts: paginationOptsValidator,
	},
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

		const enrichedPosts = Arr.filter(
			await Promise.all(
				filteredMessages.map((message) =>
					enrichedMessageWithServerAndChannels(ctx, message),
				),
			),
			Predicate.isNotNullable,
		);

		return {
			page: enrichedPosts,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
