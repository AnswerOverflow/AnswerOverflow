import { internalMutation, internalQuery } from "./_generated/server";
import { components } from "./_generated/api";
import { createFunctionHandle } from "convex/server";
import { v } from "convex/values";

export const directCall = internalMutation({
  args: {},
  handler: async (ctx, _args) => {
    await ctx.runMutation(components.counter.public.add, {
      name: "pennies",
      count: 250,
    });
    await ctx.runMutation(components.counter.public.add, {
      name: "beans",
      count: 3,
      shards: 100,
    });
    const count = await ctx.runQuery(components.counter.public.count, {
      name: "beans",
    });
    return count;
  },
});

export const mutationWithNestedQuery = internalMutation({
  args: {},
  handler: async (ctx, _args): Promise<number> => {
    return await ctx.runMutation(
      components.counter.public.mutationWithNestedQuery,
    );
  },
});

export const directCall2 = internalQuery({
  args: {},
  handler: async (ctx, _args) => {
    const count = await ctx.runQuery(components.counter.public.count, {
      name: "beans",
    });
    return count;
  },
});

export const schedule = internalMutation({
  args: {},
  handler: async (ctx, _args) => {
    await ctx.runMutation(components.counter.public.schedule, {
      name: "beans",
    });
  },
});

// Note this must be a mutation because `createFunctionHandle` writes to the
// database, and we need to commit it.
// In a real Convex app, the function handle is automatically created on push,
// so it does work in queries.
export const getFunctionHandle = internalQuery({
  args: {},
  returns: v.string(),
  handler: async () => {
    const handle = await createFunctionHandle(components.counter.public.add);
    return handle;
  },
});

export const callHandle = internalMutation({
  args: {
    handle: v.string(),
  },
  handler: async (ctx, { handle }) => {
    await ctx.runMutation(
      handle as any as typeof components.counter.public.add,
      { name: "beans", count: 3 },
    );
  },
});

export const scheduleHandle = internalMutation({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    await ctx.scheduler.runAfter(
      1000,
      handle as any as typeof components.counter.public.add,
      { name: "beans", count: 3 },
    );
  },
});
