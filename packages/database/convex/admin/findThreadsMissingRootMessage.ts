import { v } from "convex/values";
import { ChannelType } from "discord-api-types/v10";
import { internal } from "../_generated/api";
import { internalAction } from "../client";
import type { ThreadMissingRootMessage } from "./findThreadsMissingRootMessagePage";
import { threadMissingRootMessageValidator } from "./findThreadsMissingRootMessagePage";

const THREAD_TYPES = [
	ChannelType.AnnouncementThread,
	ChannelType.PublicThread,
	ChannelType.PrivateThread,
] as const;

type PageResult = {
	threadsWithMissingRootMessage: Array<ThreadMissingRootMessage>;
	channelsProcessed: number;
	isDone: boolean;
	continueCursor: string;
};

export const findThreadsMissingRootMessage = internalAction({
	args: {},
	returns: v.object({
		threads: v.array(threadMissingRootMessageValidator),
		totalChannelsProcessed: v.number(),
	}),
	handler: async (ctx) => {
		const threads: Array<ThreadMissingRootMessage> = [];
		let totalChannelsProcessed = 0;
		const limit = 1000;

		for (const threadType of THREAD_TYPES) {
			if (threads.length >= limit) {
				break;
			}

			let cursor: string | null = null;
			let isDone = false;

			while (!isDone && threads.length < limit) {
				const result: PageResult = await ctx.runQuery(
					internal.admin.findThreadsMissingRootMessagePage
						.findThreadsMissingRootMessagePage,
					{
						paginationOpts: {
							numItems: 100,
							cursor,
						},
						threadType,
					},
				);

				totalChannelsProcessed += result.channelsProcessed;
				threads.push(...result.threadsWithMissingRootMessage);
				isDone = result.isDone;
				cursor = result.continueCursor;
			}
		}

		return {
			threads: threads.slice(0, limit),
			totalChannelsProcessed,
		};
	},
});
