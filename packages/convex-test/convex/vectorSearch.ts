import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { action, internalQuery } from "./_generated/server";

export const get = internalQuery({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/// vector search (1.0/actions/vectorSearch)

export const vectorSearch = action({
  args: {
    author: v.union(v.string(), v.null()),
    embedding: v.array(v.number()),
    limit: v.number(),
  },
  handler: async (ctx, { author, embedding, limit }) => {
    const results = await ctx.vectorSearch("messages", "embedding", {
      vector: embedding,
      filter: author !== null ? (q) => q.eq("author", author) : undefined,
      limit,
    });
    return Promise.all(
      results.map(async ({ _id, _score }) => {
        const doc: Doc<"messages"> = (await ctx.runQuery(
          internal.vectorSearch.get,
          { id: _id },
        ))!;
        return {
          ...doc,
          score: _score,
        };
      }),
    );
  },
});
