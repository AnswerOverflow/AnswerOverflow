import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { guildManagerQuery } from "../client/guildManager";
import { isThreadType } from "../shared/channels";
import {
	channelWithSystemFieldsValidator,
	enrichedMessageValidator,
	paginatedValidator,
} from "../shared/publicSchemas";
import { enrichThreads } from "../shared/threads";

const threadTagValidator = v.object({ id: v.int64(), name: v.string() });

const dashboardThreadItemValidator = v.object({
	thread: channelWithSystemFieldsValidator,
	message: v.union(enrichedMessageValidator, v.null()),
	parentChannel: v.union(
		v.object({
			id: v.int64(),
			name: v.string(),
			type: v.number(),
		}),
		v.null(),
	),
	tags: v.array(threadTagValidator),
});

export const getThreadsForServer = guildManagerQuery({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	returns: paginatedValidator(dashboardThreadItemValidator),
	handler: async (ctx, args) => {
		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.order("desc")
			.paginate(args.paginationOpts);

		const threads = paginatedResult.page.filter((channel) =>
			isThreadType(channel.type),
		);

		const page = await enrichThreads(ctx, threads);

		return {
			page,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
