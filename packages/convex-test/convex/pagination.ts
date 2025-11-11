import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

/// paginate (1.0/queryPage)

export const list = query({
  args: {
    author: v.string(),
    paginationOptions: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("author"), args.author))
      .paginate(args.paginationOptions);
  },
});
