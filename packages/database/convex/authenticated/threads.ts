import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { ChannelType } from "discord-api-types/v10";
import { guildManagerQuery } from "../client/guildManager";
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
		sortOrder: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
	},
	returns: paginatedValidator(dashboardThreadItemValidator),
	handler: async (ctx, args) => {
		const order = args.sortOrder === "oldest" ? "asc" : "desc";

		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_serverId_and_id", (q) => q.eq("serverId", args.serverId))
			.filter((q) =>
				q.or(
					q.eq(q.field("type"), ChannelType.PublicThread),
					q.eq(q.field("type"), ChannelType.PrivateThread),
					q.eq(q.field("type"), ChannelType.AnnouncementThread),
				),
			)
			.order(order)
			.paginate(args.paginationOpts);

		const page = await enrichThreads(ctx, paginatedResult.page);

		return {
			page,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
