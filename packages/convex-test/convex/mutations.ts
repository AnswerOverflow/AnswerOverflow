import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/// helpers

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});

/// insert

export const insert = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    const message = { body, author };
    return await ctx.db.insert("messages", message);
  },
});

/// patch

export const patch = mutation({
  args: { id: v.id("messages"), body: v.string() },
  handler: async (ctx, { id, body }) => {
    await ctx.db.patch(id, { body });
  },
});

/// replace

export const replace = mutation({
  args: { id: v.id("messages"), author: v.string(), body: v.string() },
  handler: async (ctx, { id, author, body }) => {
    await ctx.db.replace(id, { author, body });
  },
});

/// delete

export const deleteDoc = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/// transaction

export const throws = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    const message = { body, author };
    await ctx.db.insert("messages", message);
    throw new Error("I changed my mind");
  },
});

export const append = mutation({
  args: { id: v.id("messages"), suffix: v.string() },
  handler: async (ctx, { id, suffix }) => {
    const message = (await ctx.db.get(id))!;
    await ctx.db.patch(id, { body: message.body + suffix });
  },
});

export const rolledBackSubtransaction = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.db.insert("messages", { body: "hello", author: "sarah" });
    try {
      await ctx.runMutation(api.mutations.throws, {
        body: "hello",
        author: "lee",
      });
    } catch (e) {
      // ignore
    }
    await ctx.db.insert("messages", { body: "world", author: "sarah" });
    const docs = await ctx.db.query("messages").collect();
    return docs.length;
  },
});

export const subtransactionCommitThenRollbackParent = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(api.mutations.insert, {
      body: "hello",
      author: "sarah",
    });
    await ctx.runMutation(api.mutations.throws, {
      body: "hello",
      author: "lee",
    });
  },
});

export const patchAndRead = mutation({
  args: { id: v.id("messages"), body: v.string() },
  handler: async (ctx, { id, body }): Promise<string[]> => {
    await ctx.db.patch(id, { body });
    return (await ctx.db.query("messages").collect()).map(({ body }) => body);
  },
});

export const insertThenPatchInSubtransaction = mutation({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const id = await ctx.db.insert("messages", {
      body: "hello",
      author: "sarah",
    });
    return await ctx.runMutation(api.mutations.patchAndRead, {
      id,
      body: "hi",
    });
  },
});

export const deleteAndRead = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }): Promise<string[]> => {
    await ctx.db.delete(id);
    return (await ctx.db.query("messages").collect()).map(({ body }) => body);
  },
});

export const insertThenDeleteInSubtransaction = mutation({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const id = await ctx.db.insert("messages", {
      body: "hello",
      author: "sarah",
    });
    return await ctx.runMutation(api.mutations.deleteAndRead, { id });
  },
});
