import { v } from "convex/values";
import { internalQuery } from "../client";

export const getThreadMetadata = internalQuery({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, args) => {
		const metadata = await ctx.db
			.query("chatThreadMetadata")
			.withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
			.first();

		if (!metadata) {
			return null;
		}

		return {
			threadId: metadata.threadId,
			repos: metadata.repos,
		};
	},
});
