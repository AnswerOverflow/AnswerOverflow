import { v } from "convex/values";
import { getManyFrom } from "convex-helpers/server/relationships";
import { privateMutation } from "../client";

export const syncThreadTags = privateMutation({
	args: {
		threadId: v.int64(),
		parentChannelId: v.int64(),
		tagIds: v.array(v.int64()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const existingTags = await getManyFrom(
			ctx.db,
			"threadTags",
			"by_threadId",
			args.threadId,
		);

		for (const tag of existingTags) {
			await ctx.db.delete(tag._id);
		}

		for (const tagId of args.tagIds) {
			await ctx.db.insert("threadTags", {
				threadId: args.threadId,
				tagId,
				parentChannelId: args.parentChannelId,
			});
		}

		return null;
	},
});
