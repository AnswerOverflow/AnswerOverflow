import { v } from "convex/values";
import { publicQuery } from "./custom_functions";

export const publicSearch = publicQuery({
	args: {
		query: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("messages")
			.withSearchIndex("search_content", (q) => q.search("content", args.query))
			.collect();
	},
});
