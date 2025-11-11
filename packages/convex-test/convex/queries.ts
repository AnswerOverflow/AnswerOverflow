import { v } from "convex/values";
import { query } from "./_generated/server";

/// collect (1.0/queryStream, 1.0/queryStreamNext)

export const list = query(async (ctx) => {
  return await ctx.db.query("messages").collect();
});

export const count = query(async (ctx) => {
  return await (ctx.db.query("messages") as any).count();
});

/// order

export const lastN = query({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const lastMessages = await ctx.db
      .query("messages")
      .order("desc")
      .take(args.count);
    return lastMessages.reverse();
  },
});

/// default exports

export default query(async (ctx) => {
  return ctx.db.query("messages").collect();
});
