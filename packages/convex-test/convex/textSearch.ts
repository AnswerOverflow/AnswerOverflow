import { v } from "convex/values";
import { query } from "./_generated/server";

/// search (Search index)

export const textSearch = query({
  args: { author: v.union(v.string(), v.null()), body: v.string() },
  handler: async (ctx, { author, body }) => {
    return await ctx.db
      .query("messages")
      .withSearchIndex("body", (q) => {
        const filter = q.search("body", body);
        return author !== null ? filter.eq("author", author) : filter;
      })
      .collect();
  },
});
