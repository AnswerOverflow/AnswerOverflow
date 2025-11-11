import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalQuery,
  mutation,
} from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/// helpers

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});

export const add = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    const message = { body, author };
    await ctx.db.insert("messages", message);
  },
});

/// action calling query (1.0/actions/query)

export const actionCallingQuery = internalAction({
  args: {},
  handler: async (ctx) => {
    const result: Doc<"messages">[] = await ctx.runQuery(
      internal.actions.list,
      {},
    );
    return result;
  },
});

/// action calling mutation (1.0/actions/mutation)

export const actionCallingMutation = action({
  args: { body: v.string() },
  handler: async (ctx, { body }) => {
    await ctx.runMutation(api.actions.add, { body, author: "AI" });
  },
});

/// action calling action (1.0/actions/action)

export const actionCallingAction = internalAction({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    if (count > 0) {
      const result: { called: number } = await ctx.runAction(
        internal.actions.actionCallingAction,
        { count: count - 1 },
      );
      return { called: result.called + 1 };
    }
    return { called: 0 };
  },
});

/// actions calling mutations concurrently

export const actionCallingMutationsConcurrently = action({
  args: { authors: v.array(v.string()), body: v.string() },
  handler: async (ctx, { authors, body }) => {
    await Promise.all(
      authors.map(async (author) => {
        return await ctx.runMutation(api.actions.add, { body, author });
      }),
    );
  },
});
