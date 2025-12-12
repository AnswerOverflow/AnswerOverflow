import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { enrichMessageForDisplay, getMessageById } from "../shared/shared";
import {
	paginatedValidator,
	enrichedMessageValidator,
} from "../shared/publicSchemas";
import { channelSchema } from "../schema";
import { publicQuery } from "./custom_functions";

export const getChannelPageThreads = publicQuery({
	args: {
		channelDiscordId: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginatedValidator(
		v.object({
			thread: channelSchema,
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

		const page = await asyncMap(threads, async (thread) => {
			const message = await getMessageById(ctx, thread.id);
			return {
				thread,
				message: message ? await enrichMessageForDisplay(ctx, message) : null,
			};
		});

		return {
			page,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
