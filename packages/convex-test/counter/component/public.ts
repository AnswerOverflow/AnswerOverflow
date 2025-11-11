import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const add = mutation({
  args: {
    name: v.string(),
    count: v.number(),
    shards: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const shard = Math.floor(Math.random() * (args.shards ?? 1));
    const counter = await ctx.db
      .query("counters")
      .withIndex("name", (q) => q.eq("name", args.name).eq("shard", shard))
      .unique();
    if (counter) {
      await ctx.db.patch(counter._id, {
        value: counter.value + args.count,
      });
    } else {
      await ctx.db.insert("counters", {
        name: args.name,
        value: args.count,
        shard,
      });
    }
  },
});

export const count = query({
  args: { name: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const counters = await ctx.db
      .query("counters")
      .withIndex("name", (q) => q.eq("name", args.name))
      .collect();
    return counters.reduce((sum, counter) => sum + counter.value, 0);
  },
});

export const schedule = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, api.public.add, {
      name: args.name,
      count: 1,
    });
  },
});

// Regression test: if a nested query isn't accounted for correctly, the
// function stack can get messed up and the `ctx.db.get` might try to look in
// the wrong component.
export const mutationWithNestedQuery = mutation({
  args: {},
  handler: async (ctx, _args) => {
    const id = await ctx.db.insert("counters", {
      name: "beans",
      value: 3,
      shard: 0,
    });
    await ctx.runQuery(api.public.count, { name: "beans" });
    const doc = await ctx.db.get(id);
    return doc!.value;
  },
});

export const mutationWithNumberArg = mutation({
  args: { a: v.number() },
  handler: async (_ctx, args) => {
    return args.a;
  },
});
