import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { Array as Arr, Predicate } from "effect";
import { enrichMessages } from "../shared/dataAccess";
import {
	getFirstMessagesInChannels,
	getThreadStartMessage,
} from "../shared/shared";
import { publicQuery } from "./custom_functions";

export const getChannelPageThreads = publicQuery({
	args: {
		channelDiscordId: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_parentId_and_id", (q) =>
				q.eq("parentId", args.channelDiscordId),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const threads = paginatedResult.page;
		const threadIds = threads.map((t) => t.id);
		const [firstMessages, rootMessages] = await Promise.all([
			getFirstMessagesInChannels(ctx, threadIds),
			Promise.all(threadIds.map((id) => getThreadStartMessage(ctx, id))),
		]);

		const rootMessageIds = new Set(
			Arr.filter(rootMessages, Predicate.isNotNull).map((m) => m.id),
		);

		const threadsWithRootMessage = Arr.filter(threads, (thread) =>
			rootMessageIds.has(thread.id),
		);

		const messages = Arr.filter(
			Arr.map(
				threadsWithRootMessage,
				(thread) => firstMessages[thread.id.toString()] ?? null,
			),
			Predicate.isNotNull,
		);

		const enrichedMessages = await enrichMessages(ctx, messages);

		const enrichedMessagesMap = new Map(
			enrichedMessages.map((em) => [em.message.id, em]),
		);

		const page = Arr.filter(
			Arr.map(threadsWithRootMessage, (thread) => {
				const message = firstMessages[thread.id.toString()];
				if (!message) return null;
				const enrichedMessage = enrichedMessagesMap.get(message.id);
				if (!enrichedMessage) return null;
				return {
					thread,
					message: enrichedMessage,
				};
			}),
			Predicate.isNotNull,
		);

		return {
			page,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});
