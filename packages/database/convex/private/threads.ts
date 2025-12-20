import { v } from "convex/values";
import { internal } from "../_generated/api";
import { privateAction } from "../client";
import { threadMissingRootMessageValidator } from "../admin/findThreadsMissingRootMessagePage";

export const findThreadsMissingRootMessage = privateAction({
	args: {},
	returns: v.object({
		threads: v.array(threadMissingRootMessageValidator),
		totalChannelsProcessed: v.number(),
	}),
	handler: async (ctx) => {
		return await ctx.runAction(
			internal.admin.findThreadsMissingRootMessage.findThreadsMissingRootMessage,
			{},
		);
	},
});
