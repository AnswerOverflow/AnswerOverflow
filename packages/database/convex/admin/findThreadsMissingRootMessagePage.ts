import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import type { Id } from "../_generated/dataModel";
import { internalQuery } from "../client";

export const threadMissingRootMessageValidator = v.object({
	threadId: v.int64(),
	threadConvexId: v.id("channels"),
	serverId: v.int64(),
	parentChannelId: v.optional(v.int64()),
});

export type ThreadMissingRootMessage = {
	threadId: bigint;
	threadConvexId: Id<"channels">;
	serverId: bigint;
	parentChannelId: bigint | undefined;
};

export const findThreadsMissingRootMessagePage = internalQuery({
	args: {
		paginationOpts: paginationOptsValidator,
		threadType: v.number(),
	},
	returns: v.object({
		threadsWithMissingRootMessage: v.array(threadMissingRootMessageValidator),
		channelsProcessed: v.number(),
		isDone: v.boolean(),
		continueCursor: v.string(),
	}),
	handler: async (ctx, args) => {
		const paginatedChannels = await ctx.db
			.query("channels")
			.withIndex("by_type", (q) => q.eq("type", args.threadType))
			.paginate(args.paginationOpts);

		const threadsWithMissingRootMessage: Array<ThreadMissingRootMessage> = [];

		for (const channel of paginatedChannels.page) {
			const rootMessage = await getOneFrom(
				ctx.db,
				"messages",
				"by_messageId",
				channel.id,
				"id",
			);

			if (!rootMessage) {
				threadsWithMissingRootMessage.push({
					threadId: channel.id,
					threadConvexId: channel._id,
					serverId: channel.serverId,
					parentChannelId: channel.parentId,
				});
			}
		}

		return {
			threadsWithMissingRootMessage,
			channelsProcessed: paginatedChannels.page.length,
			isDone: paginatedChannels.isDone,
			continueCursor: paginatedChannels.continueCursor,
		};
	},
});
