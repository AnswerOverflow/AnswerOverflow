import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, internalQuery, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});

export const add = mutation({
  args: {
    body: v.string(),
    author: v.string(),
    // Just used to test serialization of scheduled function arguments
    bigint: v.optional(v.int64()),
  },
  handler: async (ctx, { body, author }) => {
    if (body === "FAIL THIS") {
      throw new Error("failed as intended");
    }
    const message = { body, author };
    await ctx.db.insert("messages", message);
  },
});

export const actionCallingMutation = action({
  args: { body: v.string(), bigint: v.optional(v.int64()) },
  handler: async (ctx, { body, bigint }) => {
    await ctx.runMutation(api.scheduler.add, { body, author: "AI", bigint });
  },
});

export const jobs = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.system.query("_scheduled_functions").collect();
  },
});

/// mutation scheduling action (1.0/schedule)

export const mutationSchedulingAction = mutation({
  args: {
    body: v.string(),
    delayMs: v.number(),
    bigint: v.optional(v.int64()),
  },
  handler: async (ctx, { body, delayMs, bigint }) => {
    const id: Id<"_scheduled_functions"> = await ctx.scheduler.runAfter(
      delayMs,
      api.scheduler.actionCallingMutation,
      { body, bigint },
    );
    return id;
  },
});

/// cancel scheduled function (1.0/cancel_job)

export const cancel = mutation({
  args: { id: v.id("_scheduled_functions") },
  handler: async (ctx, { id }) => {
    await ctx.scheduler.cancel(id);
  },
});

/// actions scheduling action (1.0/actions/schedule)

export const actionSchedulingAction = action({
  args: { body: v.string(), delayMs: v.number() },
  handler: async (ctx, { body, delayMs }) => {
    const id: Id<"_scheduled_functions"> = await ctx.scheduler.runAfter(
      delayMs,
      api.scheduler.actionCallingMutation,
      { body },
    );
    return id;
  },
});

/// cancel scheduled function via action (1.0/actions/cancel_job)

export const cancelAction = action({
  args: { id: v.id("_scheduled_functions") },
  handler: async (ctx, { id }) => {
    await ctx.scheduler.cancel(id);
  },
});

/// many scheduled functions

export const actionSchedulingActionNTimes = action({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    await ctx.runMutation(api.scheduler.add, {
      body: `count ${count}`,
      author: "AI",
    });
    if (count > 0) {
      await ctx.scheduler.runAfter(
        0,
        api.scheduler.actionSchedulingActionNTimes,
        { count: count - 1 },
      );
    }
  },
});

export const selfSchedulingMutation = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      1000,
      api.scheduler.selfSchedulingMutation,
      {},
    );
  },
});
