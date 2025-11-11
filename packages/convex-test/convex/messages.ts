import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

export const list = query(async (ctx) => {
  return await ctx.db.query("messages").collect();
});

export const listByAuth = query(async (ctx) => {
  const user = await ctx.auth.getUserIdentity();
  return await ctx.db
    .query("messages")
    .filter((q) => q.eq(q.field("author"), user!.name))
    .collect();
});

export const send = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    const message = { body, author };
    await ctx.db.insert("messages", message);
  },
});

export const sendAIMessage = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const response = await fetch("https://api.openai.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "gpt89", prompt }),
    });
    const message = await response.text();
    await ctx.runMutation(api.messages.send, { body: message, author: "AI" });
  },
});
