import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { createDataAccessCache, enrichMessage } from "../shared/dataAccess";
import {
	channelWithSystemFieldsValidator,
	enrichedMessageValidator,
	paginatedValidator,
} from "../shared/publicSchemas";
import { getMessageById } from "../shared/shared";
import { publicQuery } from "./custom_functions";

export const getChannelPageThreads = publicQuery({
	args: {
		channelDiscordId: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginatedValidator(
		v.object({
			thread: channelWithSystemFieldsValidator,
			message: v.union(enrichedMessageValidator, v.null()),
		}),
	),
	handler: async (ctx, args) => {
		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_parentId_and_id", (q) =>
				q.eq("parentId", args.channelDiscordId),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const threads = paginatedResult.page;

		const cache = createDataAccessCache(ctx);
		const page = await asyncMap(threads, async (thread) => {
			const message = await getMessageById(ctx, thread.id);
			const enrichedMessage = message
				? await enrichMessage(ctx, cache, message)
				: null;

			return {
				thread,
				message: enrichedMessage,
			};
		});

		return {
			page,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
