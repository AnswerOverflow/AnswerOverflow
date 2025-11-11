import { expect, test } from "vitest";
import { convexTest } from "../index";
import { api } from "./_generated/api";
import schema from "./schema";

test("vector search", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", {
      author: "sarah",
      body: "convex",
      embedding: [1, 1, 1],
    });
    await ctx.db.insert("messages", {
      author: "michal",
      body: "next",
      embedding: [0, 0, 0],
    });
    await ctx.db.insert("messages", {
      author: "sarah",
      body: "base",
      embedding: [1, 1, 0],
    });
    await ctx.db.insert("messages", {
      author: "michal",
      body: "rad",
      embedding: [1, 1, 0],
    });
  });
  {
    const messages = await t.action(api.vectorSearch.vectorSearch, {
      embedding: [1, 1, 1],
      author: null,
      limit: 3,
    });
    expect(messages).toMatchObject([
      { author: "sarah", body: "convex" },
      { author: "sarah", body: "base" },
      { author: "michal", body: "rad" },
    ]);
  }
  {
    const messages = await t.action(api.vectorSearch.vectorSearch, {
      embedding: [1, 1, 1],
      author: "sarah",
      limit: 10,
    });
    expect(messages).toMatchObject([
      { author: "sarah", body: "convex" },
      { author: "sarah", body: "base" },
    ]);
  }
});
