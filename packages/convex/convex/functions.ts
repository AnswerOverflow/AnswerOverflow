import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Auth } from "convex/server";

export const getUserId = async (ctx: { auth: Auth }) => {
  return (await ctx.auth.getUserIdentity())?.subject;
};

export const createEntry = mutation({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("entries", args);
  },
});

export const getEntries = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("entries").collect();
  },
});

export const removeEntry = mutation({
  args: {
    id: v.id("entries"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
